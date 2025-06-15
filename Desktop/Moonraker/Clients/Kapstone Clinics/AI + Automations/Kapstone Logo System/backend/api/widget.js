const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const Clinic = require('../models/Clinic');
const memoryStore = require('../storage/memoryStore');

// Ensure MongoDB connection for serverless functions
const connectMongoDB = async () => {
  if (mongoose.connection.readyState === 0 || mongoose.connection.readyState === 3) {
    try {
      console.log('Connecting to MongoDB...', process.env.MONGODB_URI ? 'URI provided' : 'No URI');
      await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/kapstone-logos', {
        useNewUrlParser: true,
        useUnifiedTopology: true,
        serverSelectionTimeoutMS: 10000, // 10 second timeout
        connectTimeoutMS: 10000,
        maxPoolSize: 1, // Limit connection pool for serverless
        bufferCommands: false // Disable mongoose buffering
      });
      console.log('✅ MongoDB connected in widget API');
    } catch (err) {
      console.log('⚠️  MongoDB connection failed in widget API:', err.message);
    }
  } else if (mongoose.connection.readyState === 1) {
    console.log('MongoDB already connected');
  } else {
    console.log('MongoDB connection state:', mongoose.connection.readyState);
  }
};

// Check if MongoDB is available
const isMongoAvailable = () => {
  return mongoose.connection.readyState === 1;
};

// Serve logo widget
router.get('/logo/:clinicId', async (req, res) => {
  try {
    const { clinicId } = req.params;
    const referer = req.get('referer');
    
    // Ensure MongoDB connection with retry
    await connectMongoDB();
    
    let clinic;
    let mongoAvailable = isMongoAvailable();
    console.log('Widget request for clinic:', clinicId, 'MongoDB available:', mongoAvailable);
    
    // If MongoDB not available, try connecting again
    if (!mongoAvailable) {
      console.log('Retrying MongoDB connection...');
      await connectMongoDB();
      mongoAvailable = isMongoAvailable();
      console.log('MongoDB retry result:', mongoAvailable);
    }
    
    if (mongoAvailable) {
      try {
        clinic = await Clinic.findOne({ 
          clinicId, 
          status: 'approved' 
        });
        
        console.log('MongoDB search result:', clinic ? 'found' : 'not found');
        
        if (!clinic) {
          return res.status(404).send('// Clinic not found or not approved');
        }
        
        // Update impressions
        clinic.impressions += 1;
        clinic.lastImpression = new Date();
        await clinic.save();
      } catch (mongoError) {
        console.log('MongoDB query error:', mongoError.message);
        // Fall back to memory store if MongoDB query fails
        clinic = memoryStore.findClinic(clinicId);
        
        if (!clinic || clinic.status !== 'approved') {
          return res.status(404).send('// Clinic not found or not approved');
        }
        
        memoryStore.incrementImpressions(clinicId);
      }
    } else {
      clinic = memoryStore.findClinic(clinicId);
      
      console.log('Memory store search result:', clinic ? 'found' : 'not found');
      
      if (!clinic || clinic.status !== 'approved') {
        return res.status(404).send('// Clinic not found or not approved');
      }
      
      // Update impressions
      memoryStore.incrementImpressions(clinicId);
    }
    
    // Domain verification disabled for now to allow testing on any domain
    // if (referer && process.env.NODE_ENV === 'production') {
    //   const refererUrl = new URL(referer);
    //   const refererDomain = refererUrl.hostname;
    //   
    //   const domainVerified = clinic.domains.some(d => 
    //     d.domain === refererDomain && d.verified
    //   );
    //   
    //   if (!domainVerified) {
    //     return res.status(403).send('// Domain not authorized');
    //   }
    // }
    
    // Generate widget JavaScript
    const widgetScript = `
(function() {
  console.log('Kapstone widget loading for clinic: ${clinicId}');
  
  // Find container - try multiple methods for compatibility
  var container = document.currentScript ? document.currentScript.parentElement : document.body;
  console.log('Container found:', container);
  
  // Create wrapper with unique ID to avoid conflicts
  var wrapper = document.createElement('div');
  wrapper.className = 'kapstone-verified-badge';
  wrapper.id = 'kapstone-badge-${clinicId}';
  wrapper.style.cssText = 'display: block !important; text-align: center; margin: 20px auto; padding: 0; width: fit-content; clear: both; position: relative; z-index: 9999; background: transparent;';
  
  // Create link
  var link = document.createElement('a');
  link.href = 'https://kapstoneclinics.com';
  link.target = '_blank';
  link.rel = 'noopener noreferrer';
  link.title = 'Verified by Kapstone Clinics';
  link.style.cssText = 'display: inline-block !important; text-decoration: none;';
  
  // Create image with error handling
  var img = document.createElement('img');
  img.src = '${req.get('host').includes('vercel.app') ? 'https' : req.protocol}://${req.get('host')}/api/logos/${clinic.logoVersion}.png';
  img.alt = 'Kapstone Verified Clinic';
  img.style.cssText = 'max-width: 200px !important; height: auto !important; display: block !important; margin: 0 auto; border: 0; opacity: 1 !important; visibility: visible !important;';
  
  // Add error handling for image loading
  img.onerror = function() {
    console.log('Kapstone logo failed to load:', img.src);
    // Create fallback text if image fails
    var fallback = document.createElement('div');
    fallback.innerHTML = 'Kapstone Verified Clinic';
    fallback.style.cssText = 'padding: 10px; background: #0066cc; color: white; border-radius: 4px; font-family: Arial, sans-serif; font-size: 14px;';
    wrapper.appendChild(fallback);
  };
  img.onload = function() {
    console.log('Kapstone logo loaded successfully:', img.src);
  };
  
  // Assemble elements
  link.appendChild(img);
  wrapper.appendChild(link);
  
  // Insert into page
  try {
    if (document.currentScript && document.currentScript.parentElement) {
      document.currentScript.parentElement.appendChild(wrapper);
      console.log('Badge inserted next to script tag');
    } else {
      // Fallback: append to body
      document.body.appendChild(wrapper);
      console.log('Badge inserted into body');
    }
  } catch (e) {
    console.error('Error inserting Kapstone badge:', e);
  }
  
  console.log('Kapstone widget setup complete');
})();`;
    
    // Add cache-busting headers
    res.set({
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0'
    });
    
    res.type('application/javascript');
    res.send(widgetScript);
    
  } catch (error) {
    console.error('Widget error:', error);
    res.status(500).send('// Error loading widget');
  }
});

// Verify domain ownership
router.post('/verify-domain', async (req, res) => {
  try {
    const { clinicId, domain, verificationToken } = req.body;
    
    // In production, you would verify domain ownership via DNS TXT record or file upload
    // For now, we'll simulate verification
    
    const clinic = await Clinic.findOne({ clinicId });
    if (!clinic) {
      return res.status(404).json({ error: 'Clinic not found' });
    }
    
    const domainIndex = clinic.domains.findIndex(d => d.domain === domain);
    if (domainIndex >= 0) {
      clinic.domains[domainIndex].verified = true;
    } else {
      clinic.domains.push({
        domain,
        verified: true,
        addedDate: new Date()
      });
    }
    
    await clinic.save();
    res.json({ success: true, message: 'Domain verified' });
    
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Debug endpoint to check MongoDB connection
router.get('/debug/:clinicId', async (req, res) => {
  try {
    const { clinicId } = req.params;
    
    await connectMongoDB();
    const mongoAvailable = isMongoAvailable();
    
    let mongoResult = null;
    let memoryResult = null;
    
    if (mongoAvailable) {
      try {
        mongoResult = await Clinic.findOne({ clinicId });
        console.log('MongoDB debug result:', mongoResult ? 'found' : 'not found');
      } catch (err) {
        mongoResult = { error: err.message };
      }
    }
    
    memoryResult = memoryStore.findClinic(clinicId);
    
    res.json({
      clinicId,
      mongoAvailable,
      mongoResult: mongoResult ? 'found' : 'not found',
      memoryResult: memoryResult ? 'found' : 'not found',
      mongoConnectionState: mongoose.connection.readyState,
      hasMongoURI: !!process.env.MONGODB_URI
    });
    
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;