import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';
import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import crypto from 'crypto';

// Load environment variables
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3001;
const DATA_FILE = path.join(__dirname, 'data.json');

// Security Configuration - API Key removed

// Middleware - Security Headers
app.use(helmet({
  contentSecurityPolicy: false, // We'll configure CSP separately for the frontend
}));

// CORS Configuration - Restrict to specific origins
const corsOptions = {
  origin: function (origin, callback) {
    const allowedOrigins = process.env.ALLOWED_ORIGINS
      ? process.env.ALLOWED_ORIGINS.split(',').map(o => o.trim())
      : ['http://localhost:5173', 'http://localhost:3000'];

    // Allow requests with no origin (like mobile apps or Postman)
    if (!origin || allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  optionsSuccessStatus: 200
};
app.use(cors(corsOptions));

// Body Parser
app.use(express.json({ limit: '1mb' })); // Limit payload size

// Rate Limiting - Global
const globalLimiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000'), // 15 minutes
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100'), // limit each IP
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});

// Apply global rate limiting
app.use(globalLimiter);

// Logging Middleware
const logRequest = (req, res, next) => {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] ${req.method} ${req.path} - IP: ${req.ip}`);
  next();
};

app.use(logRequest);

// Health Check Endpoint (No auth required)
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// Hash password to create a namespace identifier
function hashPassword(password) {
  // Use SHA-256 for consistent namespace generation
  return crypto.createHash('sha256').update(password).digest('hex').substring(0, 16);
}

// Password validation middleware
const validatePassword = (req, res, next) => {
  const password = req.headers['x-password'];

  if (!password) {
    return res.status(400).json({
      error: 'Password required',
      message: 'Please provide a password via X-Password header'
    });
  }

  // Store the hashed namespace in request
  req.namespace = hashPassword(password);
  req.password = password; // Store original for logging

  next();
};

// Initialize data file if it doesn't exist
async function initializeDataFile() {
  try {
    await fs.access(DATA_FILE);
    // Migrate old data structure if needed
    const data = await fs.readFile(DATA_FILE, 'utf-8');
    const parsed = JSON.parse(data);

    // If old structure (not namespaced), migrate it
    if (parsed.items && !parsed.spaces) {
      const migrated = {
        spaces: {
          default: {
            items: parsed.items || [],
            lastPicked: parsed.lastPicked || null
          }
        }
      };
      await fs.writeFile(DATA_FILE, JSON.stringify(migrated, null, 2));
      console.log('Migrated data.json to namespaced structure');
    }
  } catch {
    // Create new file with namespaced structure
    await fs.writeFile(DATA_FILE, JSON.stringify({ spaces: {} }, null, 2));
    console.log('Created data.json file with namespace support');
  }
}

// Read data from file with namespace support
async function readData(namespace) {
  try {
    const data = await fs.readFile(DATA_FILE, 'utf-8');
    const parsed = JSON.parse(data);

    // Ensure spaces object exists
    if (!parsed.spaces) {
      parsed.spaces = {};
    }

    // Initialize namespace if it doesn't exist
    if (!parsed.spaces[namespace]) {
      parsed.spaces[namespace] = {
        items: [],
        lastPicked: null,
        created: new Date().toISOString()
      };
    }

    return parsed.spaces[namespace];
  } catch (error) {
    console.error('Error reading data:', error);
    return { items: [], lastPicked: null };
  }
}

// Write data to file with locking mechanism
const writeQueue = [];
let isWriting = false;

async function writeData(namespace, data) {
  return new Promise((resolve, reject) => {
    writeQueue.push({ namespace, data, resolve, reject });
    processWriteQueue();
  });
}

async function processWriteQueue() {
  if (isWriting || writeQueue.length === 0) return;

  isWriting = true;
  const { namespace, data, resolve, reject } = writeQueue.shift();

  try {
    // Read the full file
    const fileContent = await fs.readFile(DATA_FILE, 'utf-8');
    const parsed = JSON.parse(fileContent);

    // Ensure spaces object exists
    if (!parsed.spaces) {
      parsed.spaces = {};
    }

    // Update the specific namespace
    parsed.spaces[namespace] = {
      ...data,
      lastModified: new Date().toISOString()
    };

    // Write back the full structure
    await fs.writeFile(DATA_FILE, JSON.stringify(parsed, null, 2));
    resolve(true);
  } catch (error) {
    console.error('Error writing data:', error);
    reject(error);
  } finally {
    isWriting = false;
    processWriteQueue(); // Process next item in queue
  }
}

// Input validation helper
function validateItem(item) {
  if (!item || typeof item !== 'string') {
    return { valid: false, error: 'Item must be a string' };
  }

  const trimmed = item.trim();

  if (trimmed === '') {
    return { valid: false, error: 'Item cannot be empty' };
  }

  if (trimmed.length > 500) {
    return { valid: false, error: 'Item cannot exceed 500 characters' };
  }

  // Basic XSS prevention - reject obvious script tags
  if (/<script|<iframe|javascript:/i.test(trimmed)) {
    return { valid: false, error: 'Invalid characters in item' };
  }

  return { valid: true, value: trimmed };
}

// API Routes - Protected with password only

// Get all items for a specific namespace
app.get('/api/items', validatePassword, async (req, res) => {
  try {
    const data = await readData(req.namespace);
    res.json(data.items);
  } catch (error) {
    console.error('Error in GET /api/items:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Add a new item
app.post('/api/items', validatePassword, async (req, res) => {
  try {
    const { item } = req.body;

    const validation = validateItem(item);
    if (!validation.valid) {
      return res.status(400).json({ error: validation.error });
    }

    const data = await readData(req.namespace);

    // Check for duplicate
    if (data.items.includes(validation.value)) {
      return res.status(409).json({ error: 'Item already exists' });
    }

    // Limit total items
    if (data.items.length >= 1000) {
      return res.status(400).json({ error: 'Maximum number of items (1000) reached' });
    }

    data.items.push(validation.value);

    await writeData(req.namespace, data);
    res.json({ success: true, items: data.items });
  } catch (error) {
    console.error('Error in POST /api/items:', error);
    res.status(500).json({ error: 'Failed to save item' });
  }
});

// Delete an item by index
app.delete('/api/items/:index', validatePassword, async (req, res) => {
  try {
    const index = parseInt(req.params.index, 10);

    // Validate index
    if (isNaN(index) || !Number.isInteger(index) || index < 0) {
      return res.status(400).json({ error: 'Invalid index: must be a non-negative integer' });
    }

    const data = await readData(req.namespace);

    if (index >= data.items.length) {
      return res.status(404).json({ error: 'Item not found at specified index' });
    }

    const deletedItem = data.items[index];
    data.items.splice(index, 1);

    await writeData(req.namespace, data);
    res.json({
      success: true,
      items: data.items,
      deleted: deletedItem
    });
  } catch (error) {
    console.error('Error in DELETE /api/items/:index:', error);
    res.status(500).json({ error: 'Failed to delete item' });
  }
});

// Get the last picked item
app.get('/api/picked', validatePassword, async (req, res) => {
  try {
    const data = await readData(req.namespace);
    res.json(data.lastPicked || null);
  } catch (error) {
    console.error('Error in GET /api/picked:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Save the picked item
app.post('/api/picked', validatePassword, async (req, res) => {
  try {
    const { item, index } = req.body;

    // Validate input
    if (typeof index !== 'number' || index < 0 || !Number.isInteger(index)) {
      return res.status(400).json({ error: 'Invalid index' });
    }

    const validation = validateItem(item);
    if (!validation.valid) {
      return res.status(400).json({ error: validation.error });
    }

    const data = await readData(req.namespace);

    // Verify the item exists at the specified index
    if (index >= data.items.length || data.items[index] !== validation.value) {
      return res.status(400).json({ error: 'Item does not match the specified index' });
    }

    data.lastPicked = {
      item: validation.value,
      index,
      timestamp: new Date().toISOString(),
      namespace: req.namespace.substring(0, 8) + '...' // Log partial namespace for audit
    };

    await writeData(req.namespace, data);
    res.json({ success: true, lastPicked: data.lastPicked });
  } catch (error) {
    console.error('Error in POST /api/picked:', error);
    res.status(500).json({ error: 'Failed to save picked item' });
  }
});


// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);

  // Don't leak error details in production
  if (process.env.NODE_ENV === 'production') {
    res.status(500).json({ error: 'Internal server error' });
  } else {
    res.status(500).json({
      error: 'Internal server error',
      message: err.message,
      stack: err.stack
    });
  }
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Endpoint not found' });
});

// Start server
app.listen(PORT, async () => {
  await initializeDataFile();

  console.log('\n========================================');
  console.log('🚀 Server running on http://localhost:' + PORT);
  console.log('🛡️  Security Features: CORS, Helmet, Rate Limiting');
  console.log('========================================\n');

  console.log('📝 API Endpoints (All require X-Password header):');
  console.log('  GET    /api/items         - Get all items');
  console.log('  POST   /api/items         - Add a new item');
  console.log('  DELETE /api/items/:index  - Delete an item');
  console.log('  GET    /api/picked        - Get last picked item');
  console.log('  POST   /api/picked        - Save picked item');
  console.log('  GET    /health            - Health check (no auth)\n');
});