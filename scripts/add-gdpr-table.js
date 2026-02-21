require('dotenv').config();
const { Pool } = require('pg');
const path = require('path');
const fs = require('fs');

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

async function addGDPRTable() {
  try {
    console.log('Adding GDPR consent table...');
    
    // Read the GDPR consent table creation SQL from schema
    const schemaPath = path.join(__dirname, '..', 'database', 'schema.sql');
    const schema = fs.readFileSync(schemaPath, 'utf8');
    
    // Extract only the GDPR consent table and indexes
    const gdprTableMatch = schema.match(/-- GDPR Consent table[\s\S]*?CREATE INDEX IF NOT EXISTS idx_gdpr_consent_created[\s\S]*?;/);
    
    if (gdprTableMatch) {
      const gdprSQL = gdprTableMatch[0];
      
      // Split by semicolons and execute each statement
      const statements = gdprSQL.split(';').filter(s => s.trim().length > 0);
      
      for (const statement of statements) {
        if (statement.trim()) {
          try {
            await pool.query(statement + ';');
            console.log('✅ Executed:', statement.substring(0, 50) + '...');
          } catch (error) {
            // Ignore "already exists" errors
            if (error.code === '42P07' || error.code === '42710' || 
                error.message.includes('already exists') ||
                error.message.includes('duplicate key')) {
              console.log('⚠️  Already exists, skipping:', statement.substring(0, 50) + '...');
            } else {
              throw error;
            }
          }
        }
      }
      
      console.log('✅ GDPR consent table added successfully!');
    } else {
      console.log('⚠️  Could not find GDPR table SQL in schema file');
    }
    
    await pool.end();
  } catch (error) {
    console.error('❌ Error adding GDPR table:', error);
    await pool.end();
    process.exit(1);
  }
}

addGDPRTable();
