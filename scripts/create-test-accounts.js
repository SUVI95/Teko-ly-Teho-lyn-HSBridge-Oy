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

async function createTestAccounts() {
  try {
    console.log('Creating test accounts...\n');
    
    const testStudent = {
      email: 'testi.opiskelija@example.com',
      password: 'testi123',
      name: 'Testi Opiskelija'
    };
    
    // Check if test student exists
    const existingStudent = await pool.query('SELECT id FROM users WHERE email = $1', [testStudent.email]);
    
    if (existingStudent.rows.length > 0) {
      // Update password
      const hashPassword = await bcrypt.hash(testStudent.password, 10);
      await pool.query(
        'UPDATE users SET password_hash = $1, name = $2 WHERE email = $3',
        [hashPassword, testStudent.name, testStudent.email]
      );
      console.log(`✅ Updated test student: ${testStudent.email}`);
    } else {
      // Create new test student
      const hashPassword = await bcrypt.hash(testStudent.password, 10);
      await pool.query(
        'INSERT INTO users (email, password_hash, name, is_admin) VALUES ($1, $2, $3, FALSE)',
        [testStudent.email, hashPassword, testStudent.name]
      );
      console.log(`✅ Created test student: ${testStudent.email}`);
    }
    
    console.log(`\n📧 Test Student Credentials:`);
    console.log(`   Email: ${testStudent.email}`);
    console.log(`   Password: ${testStudent.password}`);
    console.log(`   Name: ${testStudent.name}`);
    
    // Create admin if not exists
    const adminEmail = 'suvi@duunijobs.com';
    const adminPassword = process.env.ADMIN_PASSWORD || 'admin123';
    
    const existingAdmin = await pool.query('SELECT id, is_admin FROM users WHERE email = $1', [adminEmail]);
    
    if (existingAdmin.rows.length > 0) {
      const hashPassword = await bcrypt.hash(adminPassword, 10);
      await pool.query(
        'UPDATE users SET password_hash = $1, is_admin = TRUE WHERE email = $2',
        [hashPassword, adminEmail]
      );
      console.log(`\n✅ Updated admin user: ${adminEmail}`);
    } else {
      const hashPassword = await bcrypt.hash(adminPassword, 10);
      await pool.query(
        'INSERT INTO users (email, password_hash, name, is_admin) VALUES ($1, $2, $3, TRUE)',
        [adminEmail, hashPassword, 'Admin']
      );
      console.log(`\n✅ Created admin user: ${adminEmail}`);
    }
    
    console.log(`\n📧 Admin Credentials:`);
    console.log(`   Email: ${adminEmail}`);
    console.log(`   Password: ${adminPassword}`);
    console.log(`\n⚠️  IMPORTANT: Change admin password after first login!`);
    
    await pool.end();
  } catch (error) {
    console.error('❌ Error creating test accounts:', error);
    await pool.end();
    process.exit(1);
  }
}

createTestAccounts();
