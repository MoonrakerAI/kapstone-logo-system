// Setup script for Vercel KV configuration
const kvStore = require('../storage/kvStore');

async function setupKV() {
  console.log('🔧 Setting up Vercel KV Storage...\n');
  
  // Check if KV is configured
  if (!process.env.KV_REST_API_URL || !process.env.KV_REST_API_TOKEN) {
    console.log('⚠️  Vercel KV not configured!');
    console.log('\nTo set up Vercel KV:');
    console.log('1. Go to your Vercel project dashboard');
    console.log('2. Navigate to the "Storage" tab');
    console.log('3. Click "Create Database" → "KV"');
    console.log('4. Follow the setup instructions');
    console.log('5. The environment variables will be automatically added');
    console.log('\nAlternatively, you can use Redis by setting REDIS_URL');
    console.log('\nFor local development, the system will use in-memory storage');
    return;
  }
  
  try {
    // Test KV connection
    await kvStore.init();
    console.log('✅ KV Store connected successfully');
    
    // Test write
    await kvStore.set('test_key', { test: true }, { ex: 60 });
    console.log('✅ Write test successful');
    
    // Test read
    const value = await kvStore.get('test_key');
    console.log('✅ Read test successful:', value);
    
    // Clean up
    await kvStore.delete('test_key');
    console.log('✅ Delete test successful');
    
    console.log('\n🎉 Vercel KV is ready for production use!');
    
  } catch (error) {
    console.error('❌ KV setup failed:', error.message);
  }
}

setupKV().catch(console.error);