const express = require('express');
const router = express.Router();
const Clinic = require('../models/Clinic');
const memoryStore = require('../storage/memoryStore');

// Check if MongoDB is available
const isMongoAvailable = () => {
  return require('mongoose').connection.readyState === 1;
};

// Serve logo widget
router.get('/logo/:clinicId', async (req, res) => {
  try {
    const { clinicId } = req.params;
    const referer = req.get('referer');
    
    let clinic;
    
    if (isMongoAvailable()) {
      clinic = await Clinic.findOne({ 
        clinicId, 
        status: 'approved' 
      });
      
      if (!clinic) {
        return res.status(404).send('// Clinic not found or not approved');
      }
      
      // Update impressions
      clinic.impressions += 1;
      clinic.lastImpression = new Date();
      await clinic.save();
    } else {
      clinic = memoryStore.findClinic(clinicId);
      
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

module.exports = router;