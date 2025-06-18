const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const rateLimit = require('express-rate-limit');
const path = require('path');

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3002;

// Middleware
app.use(cors());
app.use(express.json());

// Serve static files
app.use(express.static(path.join(__dirname, '../frontend')));

// Serve logos with explicit CORS headers
app.use('/logos', (req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET');
  res.header('Access-Control-Allow-Headers', 'Content-Type');
  next();
}, express.static(path.join(__dirname, '../public/logos')));

// Rate limiting for API
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // limit each IP to 100 requests per windowMs
});

// Rate limiting for widget endpoint
const widgetLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 30 // limit each IP to 30 requests per minute
});

// Routes
app.use('/api', apiLimiter, require('./api/clinics'));
app.use('/api/admin', apiLimiter, require('./api/admin'));
app.use('/widget', widgetLimiter, require('./api/widget'));
app.use('/widget-v2', widgetLimiter, require('./api/widget-v2'));
app.use('/api/logos', require('./api/logos'));

// MongoDB connection (optional for testing)
const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/kapstone-logos';
console.log('🔗 Attempting MongoDB connection...');
console.log('   URI exists:', !!process.env.MONGODB_URI);

mongoose.connect(mongoUri, {
  useNewUrlParser: true,
  useUnifiedTopology: true
}).then(() => {
  console.log('✅ Connected to MongoDB successfully!');
  console.log('   Database:', mongoose.connection.name);
}).catch(err => {
  console.error('❌ MongoDB connection failed:', err.message);
  console.log('⚠️  MongoDB not available - using memory storage for testing');
  console.log('   Install MongoDB or use cloud database for persistence');
});

app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
  console.log(`📋 Registration: http://localhost:${PORT}/register.html`);
  console.log(`⚙️  Admin Dashboard: http://localhost:${PORT}/admin/`);
  console.log(`🔐 Admin Login: admin / admin123`);
});