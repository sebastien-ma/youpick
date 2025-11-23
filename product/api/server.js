import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';
import crypto from 'crypto';
import { initializeDatabase, closeDatabase } from './db.js';
import {
  getSpace,
  updateSpace,
  addItem,
  removeItem,
  updateLastPicked
} from './datastore.js';

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

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

// Health Check Endpoints (No auth required)
// Standard /health endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    storage: 'postgresql'
  });
});

// Kubernetes/Cloud-native standard /healthz endpoint (used by Render, K8s, etc.)
app.get('/healthz', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    storage: 'postgresql'
  });
});

// Hash password to create a space identifier
function hashPassword(password) {
  // Use SHA-256 for consistent space ID generation
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

  // Store the hashed space ID in request
  req.spaceId = hashPassword(password);
  req.password = password; // Store original for logging

  next();
};

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

// Get all items for a specific space
app.get('/api/items', validatePassword, async (req, res) => {
  try {
    const space = await getSpace(req.spaceId);
    res.json(space.items);
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

    // Get current space data
    const space = await getSpace(req.spaceId);

    // Check for duplicate
    if (space.items.includes(validation.value)) {
      return res.status(409).json({ error: 'Item already exists' });
    }

    // Limit total items
    if (space.items.length >= 1000) {
      return res.status(400).json({ error: 'Maximum number of items (1000) reached' });
    }

    // Add the new item
    await addItem(req.spaceId, validation.value);

    // Get updated space data
    const updatedSpace = await getSpace(req.spaceId);
    res.json({ success: true, items: updatedSpace.items });
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

    // Get current space data
    const space = await getSpace(req.spaceId);

    if (index >= space.items.length) {
      return res.status(404).json({ error: 'Item not found at specified index' });
    }

    const deletedItem = space.items[index];

    // Remove the item
    await removeItem(req.spaceId, index);

    // Get updated space data
    const updatedSpace = await getSpace(req.spaceId);
    res.json({
      success: true,
      items: updatedSpace.items,
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
    const space = await getSpace(req.spaceId);
    res.json(space.lastPicked || null);
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

    // Get current space data
    const space = await getSpace(req.spaceId);

    // Verify the item exists at the specified index
    if (index >= space.items.length || space.items[index] !== validation.value) {
      return res.status(400).json({ error: 'Item does not match the specified index' });
    }

    const lastPicked = {
      item: validation.value,
      index,
      timestamp: new Date().toISOString(),
      space: req.spaceId.substring(0, 8) // Log partial space ID for audit
    };

    // Update lastPicked in database
    await updateLastPicked(req.spaceId, lastPicked);

    res.json({ success: true, lastPicked });
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

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('\nReceived SIGINT, shutting down gracefully...');
  await closeDatabase();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('\nReceived SIGTERM, shutting down gracefully...');
  await closeDatabase();
  process.exit(0);
});

// Start server
async function startServer() {
  try {
    // Initialize database connection and schema
    await initializeDatabase();

    app.listen(PORT, () => {
      console.log('\n========================================');
      console.log('🚀 Server running on http://localhost:' + PORT);
      console.log('💾 Storage: PostgreSQL Database');
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
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

startServer();