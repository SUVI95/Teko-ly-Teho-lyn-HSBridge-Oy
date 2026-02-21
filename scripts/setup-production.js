#!/usr/bin/env node

const https = require('https');
const http = require('http');

// Get URL from command line or environment
const VERCEL_URL = process.env.VERCEL_URL || process.argv[2] || 'https://your-project.vercel.app';
const SETUP_TOKEN = process.env.SETUP_TOKEN || process.argv[3] || 'change-this-in-production';

if (!VERCEL_URL || VERCEL_URL.includes('your-project')) {
  console.error('❌ Please provide Vercel URL:');
  console.error('   Usage: node scripts/setup-production.js <vercel-url> <setup-token>');
  console.error('   Or set: VERCEL_URL and SETUP_TOKEN environment variables');
  process.exit(1);
}

if (!SETUP_TOKEN || SETUP_TOKEN === 'change-this-in-production') {
  console.error('❌ Please provide SETUP_TOKEN:');
  console.error('   Generate one with: openssl rand -hex 32');
  process.exit(1);
}

function makeRequest(url, options, data) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const client = urlObj.protocol === 'https:' ? https : http;
    
    const req = client.request(url, options, (res) => {
      let body = '';
      res.on('data', (chunk) => { body += chunk; });
      res.on('end', () => {
        try {
          const parsed = JSON.parse(body);
          resolve({ status: res.statusCode, data: parsed });
        } catch (e) {
          resolve({ status: res.statusCode, data: body });
        }
      });
    });
    
    req.on('error', reject);
    
    if (data) {
      req.write(JSON.stringify(data));
    }
    
    req.end();
  });
}

async function setupProduction() {
  console.log('🚀 Setting up production database...\n');
  console.log(`📍 Vercel URL: ${VERCEL_URL}`);
  console.log(`🔑 Using SETUP_TOKEN: ${SETUP_TOKEN.substring(0, 10)}...\n`);
  
  try {
    // Step 1: Initialize database
    console.log('1️⃣  Initializing database...');
    const initResponse = await makeRequest(
      `${VERCEL_URL}/api/setup/init-db`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-setup-token': SETUP_TOKEN
        }
      },
      { token: SETUP_TOKEN }
    );
    
    if (initResponse.status === 200) {
      console.log('✅ Database initialized successfully!');
      console.log(`   Tables created: ${initResponse.data.tables?.join(', ') || 'all'}\n`);
    } else {
      console.error(`❌ Database initialization failed:`, initResponse.data);
      process.exit(1);
    }
    
    // Step 2: Create admin account
    console.log('2️⃣  Creating admin account...');
    const adminResponse = await makeRequest(
      `${VERCEL_URL}/api/setup/create-admin`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-setup-token': SETUP_TOKEN
        }
      },
      { token: SETUP_TOKEN }
    );
    
    if (adminResponse.status === 200) {
      console.log('✅ Admin account created/updated!');
      console.log(`   Email: ${adminResponse.data.email}`);
      console.log(`   Password: ${adminResponse.data.password}\n`);
    } else {
      console.error(`❌ Admin creation failed:`, adminResponse.data);
      process.exit(1);
    }
    
    console.log('🎉 Production setup complete!\n');
    console.log('📋 Next steps:');
    console.log(`   1. Go to: ${VERCEL_URL}/login`);
    console.log(`   2. Login with: ${adminResponse.data.email} / ${adminResponse.data.password}`);
    console.log(`   3. Click "📊 Hallintapaneeli" in navigation`);
    console.log(`   4. Start using the admin dashboard!\n`);
    
  } catch (error) {
    console.error('❌ Setup failed:', error.message);
    process.exit(1);
  }
}

setupProduction();
