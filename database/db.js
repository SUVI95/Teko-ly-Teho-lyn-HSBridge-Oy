const { Pool } = require('pg');
require('dotenv').config();

// Configure SSL based on DATABASE_URL
const dbConfig = {
  connectionString: process.env.DATABASE_URL
};

// Only use SSL if DATABASE_URL contains sslmode=require
if (process.env.DATABASE_URL && process.env.DATABASE_URL.includes('sslmode=require')) {
  dbConfig.ssl = {
    rejectUnauthorized: false
  };
} else if (process.env.DATABASE_URL && !process.env.DATABASE_URL.includes('sslmode=disable')) {
  // Try SSL for most cloud databases, but don't fail if not supported
  dbConfig.ssl = process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false;
}

const pool = new Pool(dbConfig);

// Test connection
pool.on('connect', () => {
  console.log('✅ Connected to PostgreSQL database');
});

pool.on('error', (err) => {
  console.error('❌ Unexpected error on idle client', err);
  process.exit(-1);
});

module.exports = pool;
