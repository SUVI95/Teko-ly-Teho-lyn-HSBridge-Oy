const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
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

async function initDatabase() {
  try {
    console.log('Connecting to database...');
    console.log('DATABASE_URL:', process.env.DATABASE_URL ? process.env.DATABASE_URL.replace(/:[^:@]+@/, ':****@') : 'Not set');
    
    // Test connection first
    let testResult;
    try {
      testResult = await pool.query('SELECT NOW()');
      console.log('✅ Database connection successful!', testResult.rows[0]);
    } catch (connError) {
      console.error('❌ Connection error:', connError.message);
      console.error('Full error:', connError);
      
      // If database doesn't exist, try connecting to postgres database to create it
      if (connError.message.includes('does not exist')) {
        console.log('⚠️  Database does not exist. Please create it first or check your DATABASE_URL.');
        console.log('💡 For Neon/cloud databases, the database should already exist in your connection string.');
      }
      throw connError;
    }
    
    // Read schema
    const schemaPath = path.join(__dirname, 'schema.sql');
    const schema = fs.readFileSync(schemaPath, 'utf8');
    
    // Execute the entire schema
    // PostgreSQL will handle IF NOT EXISTS clauses
    try {
      await pool.query(schema);
      console.log('✅ Database schema created successfully!');
    } catch (error) {
      // If error is about existing objects, that's okay
      if (error.code === '42P07' || error.code === '42710' || 
          error.message.includes('already exists') ||
          error.message.includes('duplicate key')) {
        console.log('⚠️  Some objects already exist, continuing...');
        
        // Try to execute individual parts that might be missing
        // Split by major sections
        const parts = [
          // Tables
          schema.match(/CREATE TABLE IF NOT EXISTS[\s\S]*?;/g) || [],
          // Indexes  
          schema.match(/CREATE INDEX IF NOT EXISTS[\s\S]*?;/g) || [],
          // Function
          schema.match(/CREATE OR REPLACE FUNCTION[\s\S]*?language 'plpgsql';/g) || [],
          // Trigger
          schema.match(/CREATE TRIGGER[\s\S]*?;/g) || []
        ].flat();
        
        for (const part of parts) {
          if (part) {
            try {
              await pool.query(part);
            } catch (e) {
              // Ignore "already exists" errors
              if (!(e.code === '42P07' || e.code === '42710' || e.message.includes('already exists'))) {
                console.log(`⚠️  Warning: ${e.message}`);
              }
            }
          }
        }
      } else {
        throw error;
      }
    }
    
    // Verify tables exist
    const tablesResult = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name IN ('users', 'student_progress', 'checklist_items', 'sessions')
    `);
    
    console.log(`✅ Verified ${tablesResult.rows.length} tables exist:`);
    tablesResult.rows.forEach(row => console.log(`   - ${row.table_name}`));
    
    await pool.end();
    console.log('✅ Database initialization complete!');
  } catch (error) {
    console.error('❌ Error initializing database:', error.message);
    await pool.end();
    process.exit(1);
  }
}

initDatabase();
