import pkg from 'pg';
const { Pool } = pkg;
import dotenv from 'dotenv';

dotenv.config();

// Database connection configuration
const DATABASE_URL = process.env.DATABASE_URL;
const SCHEMA_NAME = 'youpick';

if (!DATABASE_URL) {
  console.error('DATABASE_URL environment variable is not set!');
  console.error('Please set it in your .env file');
  process.exit(1);
}

// Configure SSL based on environment
// In production (Render, Heroku, etc.), we need to handle self-signed certificates
const sslConfig = process.env.NODE_ENV === 'production'
  ? {
      rejectUnauthorized: false, // Allow self-signed certificates
      // Alternatively, you can use: ssl: { rejectUnauthorized: false }
    }
  : false; // No SSL in development

// Create a connection pool
const pool = new Pool({
  connectionString: DATABASE_URL,
  ssl: sslConfig,
  max: 20, // maximum number of clients in the pool
  idleTimeoutMillis: 30000, // how long a client is allowed to remain idle before being closed
  connectionTimeoutMillis: 2000, // how long to wait for a connection
});

// Initialize database schema
async function initializeDatabase() {
  const client = await pool.connect();
  try {
    // Create schema if it doesn't exist
    await client.query(`CREATE SCHEMA IF NOT EXISTS ${SCHEMA_NAME}`);

    // Set search_path to use our schema
    await client.query(`SET search_path TO ${SCHEMA_NAME}, public`);

    console.log(`Database schema '${SCHEMA_NAME}' initialized`);
  } catch (error) {
    console.error('Error initializing database:', error);
    throw error;
  } finally {
    client.release();
  }
}

// Execute a query with the correct schema
async function query(text, params) {
  const client = await pool.connect();
  try {
    // Always set the search path before executing queries
    await client.query(`SET search_path TO ${SCHEMA_NAME}, public`);
    const result = await client.query(text, params);
    return result;
  } finally {
    client.release();
  }
}

// Get a client for transactions
async function getClient() {
  const client = await pool.connect();
  // Set search path for this client
  await client.query(`SET search_path TO ${SCHEMA_NAME}, public`);
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
  initializeDatabase,
  closeDatabase,
  SCHEMA_NAME
};