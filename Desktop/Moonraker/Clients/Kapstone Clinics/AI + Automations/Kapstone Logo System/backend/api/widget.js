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
    
    // Verify domain if referer exists (skip for testing)
    if (referer && process.env.NODE_ENV === 'production') {
      const refererUrl = new URL(referer);
      const refererDomain = refererUrl.hostname;
      
      const domainVerified = clinic.domains.some(d => 
        d.domain === refererDomain && d.verified
      );
      
      if (!domainVerified) {
        return res.status(403).send('// Domain not authorized');
      }
    }
    
    // Generate widget JavaScript
    const widgetScript = `
(function() {
  var container = document.currentScript.parentElement;
  var wrapper = document.createElement('div');
  wrapper.className = 'kapstone-verified-badge';
  wrapper.style.cssText = 'display: inline-block; position: relative;';
  
  var link = document.createElement('a');
  link.href = 'https://directory.kapstoneclinics.com/clinic/${clinicId}';
  link.target = '_blank';
  link.rel = 'noopener noreferrer';
  link.title = 'Verified by Kapstone Clinics Directory';
  
  var img = document.createElement('img');
  img.src = '${req.get('host').includes('vercel.app') ? 'https' : req.protocol}://${req.get('host')}/api/logos/${clinic.logoVersion}.png';
  img.alt = 'Kapstone Verified Clinic';
  img.style.cssText = 'max-width: 200px; height: auto;';
  
  link.appendChild(img);
  wrapper.appendChild(link);
  
  // Add verification checkmark
  var verified = document.createElement('span');
  verified.innerHTML = '✓';
  verified.style.cssText = 'position: absolute; top: -5px; right: -5px; background: #22c55e; color: white; border-radius: 50%; width: 20px; height: 20px; display: flex; align-items: center; justify-content: center; font-size: 12px; font-weight: bold; box-shadow: 0 2px 4px rgba(0,0,0,0.2);';
  wrapper.appendChild(verified);
  
  container.appendChild(wrapper);
})();`;
    
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