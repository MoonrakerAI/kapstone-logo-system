const express = require('express');
const router = express.Router();
const Clinic = require('../models/Clinic');
const { sendWelcomeEmail, sendApprovalEmail } = require('../services/emailService');

// Register new clinic
router.post('/clinics/register', async (req, res) => {
  try {
    const { name, email, website, contactPerson, phone, address, certifications } = req.body;
    
    // Check if clinic already exists
    const existingClinic = await Clinic.findOne({ 
      $or: [{ email }, { website }] 
    });
    
    if (existingClinic) {
      return res.status(400).json({ 
        error: 'Clinic with this email or website already exists' 
      });
    }
    
    // Create new clinic with auto-generated ID
    const clinic = new Clinic({
      name,
      email,
      website,
      domains: [{ 
        domain: new URL(website).hostname, 
        verified: false,
        addedDate: new Date()
      }],
      metadata: {
        contactPerson,
        phone,
        address,
        certifications
      }
    });
    
    await clinic.save();
    
    // Send welcome email with clinic ID
    await sendWelcomeEmail(clinic);
    
    res.status(201).json({
      success: true,
      clinicId: clinic.clinicId,
      message: 'Registration received. Your application is under review.',
      embedCode: `<script src="https://api.kapstoneclinics.com/widget/logo/${clinic.clinicId}"></script>`
    });
    
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get clinic status
router.get('/clinics/:clinicId/status', async (req, res) => {
  try {
    const clinic = await Clinic.findOne({ 
      clinicId: req.params.clinicId 
    }).select('clinicId name status approvedDate logoVersion domains');
    
    if (!clinic) {
      return res.status(404).json({ error: 'Clinic not found' });
    }
    
    res.json({
      clinicId: clinic.clinicId,
      name: clinic.name,
      status: clinic.status,
      approvedDate: clinic.approvedDate,
      logoVersion: clinic.logoVersion,
      verifiedDomains: clinic.domains.filter(d => d.verified).map(d => d.domain),
      embedCode: clinic.status === 'approved' 
        ? `<script src="https://api.kapstoneclinics.com/widget/logo/${clinic.clinicId}"></script>`
        : null
    });
    
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Add additional domain
router.post('/clinics/:clinicId/domains', async (req, res) => {
  try {
    const { domain, apiKey } = req.body;
    
    const clinic = await Clinic.findOne({ 
      clinicId: req.params.clinicId,
      apiKey 
    });
    
    if (!clinic) {
      return res.status(403).json({ error: 'Invalid credentials' });
    }
    
    // Check if domain already exists
    const domainExists = clinic.domains.some(d => d.domain === domain);
    if (domainExists) {
      return res.status(400).json({ error: 'Domain already registered' });
    }
    
    clinic.domains.push({
      domain,
      verified: false,
      addedDate: new Date()
    });
    
    await clinic.save();
    
    res.json({
      success: true,
      message: 'Domain added. Please verify ownership.',
      verificationInstructions: `Add this TXT record to your DNS: kapstone-verify=${clinic.clinicId}`
    });
    
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;