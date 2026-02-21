const { Pool } = require('pg');
const bcrypt = require('bcrypt');
require('dotenv').config();

// Configure SSL based on DATABASE_URL
const dbConfig = {
  connectionString: process.env.DATABASE_URL
};

if (process.env.DATABASE_URL && process.env.DATABASE_URL.includes('sslmode=require')) {
  dbConfig.ssl = { rejectUnauthorized: false };
} else if (process.env.DATABASE_URL && !process.env.DATABASE_URL.includes('sslmode=disable')) {
  dbConfig.ssl = process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false;
}

const pool = new Pool(dbConfig);

async function setupAdmin() {
  try {
    console.log('Setting up admin user...');
    
    const adminEmail = 'suvi@duunijobs.com';
    const adminPassword = process.env.ADMIN_PASSWORD || 'admin123'; // Change this!
    
    // Check if admin user exists
    const existing = await pool.query('SELECT id, is_admin FROM users WHERE email = $1', [adminEmail]);
    
    if (existing.rows.length > 0) {
      // Update existing user to admin
      const hashPassword = await bcrypt.hash(adminPassword, 10);
      await pool.query(
        'UPDATE users SET password_hash = $1, is_admin = TRUE WHERE email = $2',
        [hashPassword, adminEmail]
      );
      console.log(`✅ Updated user ${adminEmail} to admin`);
    } else {
      // Create new admin user
      const hashPassword = await bcrypt.hash(adminPassword, 10);
      await pool.query(
        'INSERT INTO users (email, password_hash, name, is_admin) VALUES ($1, $2, $3, TRUE)',
        [adminEmail, hashPassword, 'Admin']
      );
      console.log(`✅ Created admin user ${adminEmail}`);
    }
    
    console.log(`\n📧 Admin email: ${adminEmail}`);
    console.log(`🔑 Admin password: ${adminPassword}`);
    console.log(`\n⚠️  IMPORTANT: Change the password after first login!`);
    
    await pool.end();
  } catch (error) {
    console.error('❌ Error setting up admin:', error);
    await pool.end();
    process.exit(1);
  }
}

setupAdmin();
