const express = require('express');
const router = express.Router();
const kvStore = require('../storage/kvStore');
const staticStore = require('../storage/staticStore');
const Clinic = require('../models/Clinic');
const memoryStore = require('../storage/memoryStore');

// Check if MongoDB is available
const isMongoAvailable = () => {
  return require('mongoose').connection.readyState === 1;
};

// Production-ready widget endpoint
router.get('/logo/:clinicId', async (req, res) => {
  try {
    const { clinicId } = req.params;
    const referer = req.get('referer');
    
    // Set CORS headers for cross-domain widget
    res.set({
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET',
      'Cache-Control': 'public, max-age=60', // Cache for 1 minute only
      'Content-Type': 'application/javascript'
    });

    // Get clinic data from static store first (most reliable for serverless)
    let clinic = await staticStore.getClinic(clinicId);
    console.log(`Widget-v2: Static store result for ${clinicId}:`, clinic);
    
    // If not found in static store, try KV store
    if (!clinic) {
      clinic = await kvStore.getClinic(clinicId);
      console.log(`Widget-v2: KV store result for ${clinicId}:`, clinic);
    }
    
    // If not found in KV, try MongoDB directly (same logic as status API)
    if (!clinic) {
      if (isMongoAvailable()) {
        try {
          const mongoClinic = await Clinic.findOne({ 
            clinicId, 
            status: 'approved' 
          }).select('clinicId name status logoVersion');
          
          if (mongoClinic) {
            clinic = {
              clinicId: mongoClinic.clinicId,
              name: mongoClinic.name,
              status: mongoClinic.status,
              logoVersion: mongoClinic.logoVersion || 'standard'
            };
            
            // Sync to KV and static store for future requests
            await kvStore.saveClinic(clinic);
            await staticStore.saveClinic(clinic);
            console.log(`Widget-v2: Synced clinic ${clinicId} from MongoDB to KV and static`);
          }
        } catch (mongoError) {
          console.error('Widget-v2: MongoDB error:', mongoError.message);
        }
      } else {
        // Fallback to memory store
        const memoryClinic = memoryStore.findClinic(clinicId);
        if (memoryClinic && memoryClinic.status === 'approved') {
          clinic = {
            clinicId: memoryClinic.clinicId,
            name: memoryClinic.name,
            status: memoryClinic.status,
            logoVersion: memoryClinic.logoVersion || 'standard'
          };
          
          // Sync to KV and static store for future requests
          await kvStore.saveClinic(clinic);
          await staticStore.saveClinic(clinic);
          console.log(`Widget-v2: Synced clinic ${clinicId} from memory to KV and static`);
        }
      }
    }
    
    if (!clinic) {
      console.log(`Widget-v2: Clinic ${clinicId} not found in any storage`);
      return res.status(404).send('// Clinic not found');
    }
    
    if (clinic.status !== 'approved') {
      console.log(`Widget-v2: Clinic ${clinicId} not approved (status: ${clinic.status})`);
      return res.status(204).send('// Clinic suspended or not approved');
    }
    
    // Update impressions asynchronously (don't wait)
    kvStore.incrementImpressions(clinicId).catch(err => 
      console.error('Failed to update impressions:', err)
    );
    
    // Generate optimized widget JavaScript
    const widgetScript = `(function(){
  try {
    // Create wrapper
    var w = document.createElement('div');
    w.className = 'kapstone-verified-badge';
    w.id = 'kapstone-badge-${clinicId}';
    w.style.cssText = 'display:block;text-align:center;margin:20px auto;width:fit-content;';
    
    // Create link
    var a = document.createElement('a');
    a.href = 'https://kapstoneclinics.com';
    a.target = '_blank';
    a.rel = 'noopener';
    a.title = 'Verified by Kapstone Clinics';
    
    // Create image
    var img = document.createElement('img');
    img.src = 'https://kapstone-logo-system.vercel.app/logos/${clinic.logoVersion || 'standard'}.png';
    img.alt = 'Kapstone Verified Clinic';
    img.style.cssText = 'max-width:200px;height:auto;display:block;';
    img.onerror = function() {
      console.error('Kapstone logo failed to load');
      // Show text fallback
      var t = document.createElement('span');
      t.innerHTML = 'Kapstone Verified';
      t.style.cssText = 'padding:8px 16px;background:#0066cc;color:white;border-radius:4px;font:14px/1.5 Arial,sans-serif;display:inline-block;';
      a.innerHTML = '';
      a.appendChild(t);
    };
    
    // Assemble and insert
    a.appendChild(img);
    w.appendChild(a);
    
    // Insert next to script tag or append to body
    var s = document.currentScript;
    if (s && s.parentNode) {
      s.parentNode.insertBefore(w, s.nextSibling);
    } else {
      document.body.appendChild(w);
    }
  } catch(e) {
    console.error('Kapstone widget error:', e);
  }
})();`;

    // Send the widget JavaScript
    res.send(widgetScript);
    
  } catch (error) {
    console.error('Widget error:', error);
    res.status(500).send('// Error loading widget');
  }
});

// Health check endpoint
router.get('/health', async (req, res) => {
  try {
    // Test KV connection
    await kvStore.get('health_check');
    res.json({ status: 'ok', storage: 'connected' });
  } catch (error) {
    res.json({ status: 'ok', storage: 'error', error: error.message });
  }
});

module.exports = router;