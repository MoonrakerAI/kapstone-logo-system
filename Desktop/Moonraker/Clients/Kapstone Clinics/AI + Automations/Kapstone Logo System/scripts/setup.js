#!/usr/bin/env node

const bcrypt = require('bcrypt');
const mongoose = require('mongoose');
const dotenv = require('dotenv');

dotenv.config();

async function setup() {
  try {
    console.log('🚀 Setting up Kapstone Logo System...\n');
    
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/kapstone-logos');
    console.log('✅ Connected to MongoDB');
    
    // Create admin user hash
    const adminPassword = process.env.ADMIN_PASSWORD || 'admin123';
    const passwordHash = await bcrypt.hash(adminPassword, 10);
    
    console.log('\n📋 Setup Complete!');
    console.log('================');
    console.log(`Admin Username: ${process.env.ADMIN_USERNAME || 'admin'}`);
    console.log(`Admin Password: ${adminPassword}`);
    console.log(`Password Hash: ${passwordHash}`);
    console.log('\n⚠️  IMPORTANT: Update your .env file with this hash:');
    console.log(`ADMIN_PASSWORD_HASH=${passwordHash}`);
    
    console.log('\n🌐 URLs:');
    console.log(`Registration Form: http://localhost:${process.env.PORT || 3000}/register.html`);
    console.log(`Admin Dashboard: http://localhost:${process.env.PORT || 3000}/admin/`);
    
    console.log('\n📝 Next Steps:');
    console.log('1. Update your .env file with the password hash above');
    console.log('2. Add your logo files to /public/logos/');
    console.log('3. Configure email service (SendGrid/AWS SES)');
    console.log('4. Set up your production domains');
    console.log('5. Run: npm start');
    
    process.exit(0);
    
  } catch (error) {
    console.error('❌ Setup failed:', error);
    process.exit(1);
  }
}

setup();