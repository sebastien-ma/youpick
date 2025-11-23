import pkg from 'pg';
const { Pool } = pkg;
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config();

// Database connection configuration - Using explicit parameters

// DATABASE_URL is required
const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error('DATABASE_URL environment variable is not set!');
  console.error('Please set DATABASE_URL in your .env file');
  console.error('Format: postgres://username:password@host:port/database?sslmode=require');
  process.exit(1);
}

// Parse the connection string to extract individual parameters
let dbConfig = {};
try {
  const url = new URL(DATABASE_URL);
  dbConfig = {
    user: url.username,
    password: url.password,
    host: url.hostname,
    port: parseInt(url.port) || 5432,
    database: url.pathname.slice(1) // Remove leading slash
  };
} catch (error) {
  console.error('Invalid DATABASE_URL format:', error.message);
  console.error('Expected format: postgres://username:password@host:port/database');
  process.exit(1);
}

// Validate that we have all required connection parameters
if (!dbConfig.user || !dbConfig.password || !dbConfig.host || !dbConfig.database) {
  console.error('DATABASE_URL is missing required connection parameters');
  console.error('Expected format: postgres://username:password@host:port/database');
  process.exit(1);
}

// Load CA certificate for SSL verification
const caPath = path.join(__dirname, 'ca.pem');
let caCert;

try {
  caCert = fs.readFileSync(caPath, 'utf8');
  console.log('CA certificate loaded successfully from:', caPath);
} catch (error) {
  console.error('ERROR: Failed to load CA certificate from:', caPath);
  console.error('SSL connections will fail. Please ensure ca.pem exists in the api directory.');
  process.exit(1);
}

// Configure the connection pool with explicit parameters
let poolConfig = {
  user: dbConfig.user,
  password: dbConfig.password,
  host: dbConfig.host,
  port: dbConfig.port,
  database: dbConfig.database,
  max: 20, // maximum number of clients in the pool
  idleTimeoutMillis: 30000, // how long a client is allowed to remain idle before being closed
  connectionTimeoutMillis: 2000, // how long to wait for a connection
  // SSL configuration with CA certificate
  ssl: {
    rejectUnauthorized: true, // Verify the server certificate
    ca: caCert // Use the Aiven CA certificate for verification
  }
};

// Create a connection pool
const pool = new Pool(poolConfig);

// Test database connection - similar to the example
async function testConnection() {
  const client = await pool.connect();
  try {
    const result = await client.query('SELECT VERSION()');
    console.log('Database connected successfully!');
    console.log('PostgreSQL version:', result.rows[0].version);
    return true;
  } catch (error) {
    console.error('Failed to connect to database:', error.message);
    return false;
  } finally {
    client.release();
  }
}


// Execute a query
async function query(text, params) {
  const client = await pool.connect();
  try {
    const result = await client.query(text, params);
    return result;
  } finally {
    client.release();
  }
}

// Get a client for transactions
async function getClient() {
  const client = await pool.connect();
  return client;
}

// Graceful shutdown
async function closeDatabase() {
  try {
    await pool.end();
    console.log('Database connection pool closed');
  } catch (error) {
    console.error('Error closing database connection:', error);
  }
}

export {
  pool,
  query,
  getClient,
  closeDatabase,
  testConnection
};