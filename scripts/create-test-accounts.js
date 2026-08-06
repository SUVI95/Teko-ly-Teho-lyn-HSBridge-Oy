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

async function upsertStudent({ email, password, name, label }) {
  const existing = await pool.query('SELECT id FROM users WHERE email = $1', [email]);
  const hashPassword = await bcrypt.hash(password, 10);
  if (existing.rows.length > 0) {
    await pool.query(
      'UPDATE users SET password_hash = $1, name = $2, is_admin = FALSE, is_approved = TRUE, is_active = TRUE WHERE email = $3',
      [hashPassword, name, email]
    );
    console.log(`✅ Updated ${label}: ${email}`);
  } else {
    await pool.query(
      'INSERT INTO users (email, password_hash, name, is_admin, is_approved) VALUES ($1, $2, $3, FALSE, TRUE)',
      [email, hashPassword, name]
    );
    console.log(`✅ Created ${label}: ${email}`);
  }
  console.log(`\n📧 ${label} Credentials:`);
  console.log(`   Email: ${email}`);
  console.log(`   Password: ${password}`);
  console.log(`   Name: ${name}`);
}

async function createTestAccounts() {
  try {
    console.log('Creating test accounts...\n');

    // QA student — sees Rivon / admin+test modules. Do NOT use when demoing Antti's view.
    await upsertStudent({
      email: 'testi.opiskelija@example.com',
      password: 'testi123',
      name: 'Testi Opiskelija',
      label: 'QA test student'
    });

    // Teacher screen-share — same modules as Antti (incl. taloushallinto gift), no Rivon extras.
    await upsertStudent({
      email: 'opettaja.antti@example.com',
      password: 'anttiDemo26',
      name: 'Antti Demo',
      label: 'Antti-view demo (teacher screen-share)'
    });
    
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
