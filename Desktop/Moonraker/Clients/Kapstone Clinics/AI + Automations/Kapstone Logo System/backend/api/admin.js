const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const Clinic = require('../models/Clinic');
const memoryStore = require('../storage/memoryStore');
const ClinicCache = require('../storage/clinicCache');
const kvStore = require('../storage/kvStore');
const { sendApprovalEmail } = require('../services/emailService');

// Check if MongoDB is available
const isMongoAvailable = () => {
  return require('mongoose').connection.readyState === 1;
};

// Admin authentication middleware
const authMiddleware = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  
  // For development, allow dummy-token
  if (token === 'dummy-token') {
    req.adminId = 'admin';
    return next();
  }
  
  if (!token) {
    return res.status(401).json({ error: 'No token provided' });
  }
  
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
    req.adminId = decoded.adminId;
    next();
  } catch (error) {
    res.status(403).json({ error: 'Invalid token' });
  }
};

// Admin login
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    
    // In production, store admin credentials in database
    const validUsername = process.env.ADMIN_USERNAME || 'admin';
    const validPasswordHash = process.env.ADMIN_PASSWORD_HASH || 
      await bcrypt.hash('admin123', 10);
    
    if (username !== validUsername) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    
    const validPassword = await bcrypt.compare(password, validPasswordHash);
    if (!validPassword) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    
    const token = jwt.sign(
      { adminId: username },
      process.env.JWT_SECRET || 'your-secret-key',
      { expiresIn: '24h' }
    );
    
    res.json({ token });
    
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get all clinics
router.get('/clinics', authMiddleware, async (req, res) => {
  try {
    const { status, page = 1, limit = 20 } = req.query;
    
    if (isMongoAvailable()) {
      const query = status ? { status } : {};
      
      const clinics = await Clinic.find(query)
        .sort({ createdAt: -1 })
        .limit(limit * 1)
        .skip((page - 1) * limit);
      
      const total = await Clinic.countDocuments(query);
      
      res.json({
        clinics,
        totalPages: Math.ceil(total / limit),
        currentPage: page,
        total
      });
    } else {
      const allClinics = memoryStore.getAllClinics(status);
      const startIndex = (page - 1) * limit;
      const clinics = allClinics.slice(startIndex, startIndex + limit);
      
      res.json({
        clinics,
        totalPages: Math.ceil(allClinics.length / limit),
        currentPage: page,
        total: allClinics.length
      });
    }
    
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update clinic status
router.patch('/clinics/:clinicId/status', authMiddleware, async (req, res) => {
  try {
    const { status } = req.body;
    
    const clinic = await Clinic.findOne({ clinicId: req.params.clinicId });
    if (!clinic) {
      return res.status(404).json({ error: 'Clinic not found' });
    }
    
    clinic.status = status;
    
    if (status === 'approved' && !clinic.apiKey) {
      clinic.approvedDate = new Date();
      clinic.generateApiKey();
      await sendApprovalEmail(clinic);
    }
    
    await clinic.save();
    
    res.json({
      success: true,
      clinic: {
        clinicId: clinic.clinicId,
        name: clinic.name,
        status: clinic.status,
        apiKey: clinic.apiKey
      }
    });
    
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Toggle clinic enabled/disabled status
router.patch('/clinics/:clinicId/toggle', authMiddleware, async (req, res) => {
  try {
    const { clinicId } = req.params;
    
    if (isMongoAvailable()) {
      const clinic = await Clinic.findOne({ clinicId });
      if (!clinic) {
        return res.status(404).json({ error: 'Clinic not found' });
      }
      
      // Toggle between approved and suspended
      clinic.status = clinic.status === 'approved' ? 'suspended' : 'approved';
      await clinic.save();
      
      // Also sync to memory store and cache for widget API fallback
      memoryStore.createOrUpdateClinic({
        clinicId: clinic.clinicId,
        name: clinic.name,
        website: clinic.website,
        status: clinic.status,
        logoVersion: clinic.logoVersion || 'standard'
      });
      
      // Save to file cache for widget API
      await ClinicCache.saveClinic(clinic);
      
      // Save to KV store for production reliability
      await kvStore.saveClinic(clinic);
      
      res.json({
        success: true,
        clinic: {
          clinicId: clinic.clinicId,
          name: clinic.name,
          status: clinic.status
        }
      });
    } else {
      const clinic = memoryStore.findClinic(clinicId);
      if (!clinic) {
        return res.status(404).json({ error: 'Clinic not found' });
      }
      
      // Toggle between approved and suspended
      clinic.status = clinic.status === 'approved' ? 'suspended' : 'approved';
      
      res.json({
        success: true,
        clinic: {
          clinicId: clinic.clinicId,
          name: clinic.name,
          status: clinic.status
        }
      });
    }
    
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get analytics
router.get('/analytics', authMiddleware, async (req, res) => {
  try {
    if (isMongoAvailable()) {
      const totalClinics = await Clinic.countDocuments();
      const approvedClinics = await Clinic.countDocuments({ status: 'approved' });
      const pendingClinics = await Clinic.countDocuments({ status: 'pending' });
      
      const topClinics = await Clinic.find({ status: 'approved' })
        .sort({ impressions: -1 })
        .limit(10)
        .select('clinicId name impressions lastImpression');
      
      const recentActivity = await Clinic.find()
        .sort({ lastImpression: -1 })
        .limit(20)
        .select('clinicId name lastImpression impressions');
      
      res.json({
        summary: {
          total: totalClinics,
          approved: approvedClinics,
          pending: pendingClinics,
          suspended: await Clinic.countDocuments({ status: 'suspended' }),
          revoked: await Clinic.countDocuments({ status: 'revoked' })
        },
        topClinics,
        recentActivity
      });
    } else {
      const summary = memoryStore.getStats();
      const topClinics = memoryStore.getTopClinics(10);
      const recentActivity = memoryStore.getRecentActivity(20);
      
      res.json({
        summary,
        topClinics,
        recentActivity
      });
    }
    
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create clinic manually
router.post('/clinics', authMiddleware, async (req, res) => {
  try {
    const { name, website, status = 'approved' } = req.body;
    
    if (isMongoAvailable()) {
      // MongoDB version
      const existingClinic = await Clinic.findOne({ 
        $or: [{ website }] 
      });
      
      if (existingClinic) {
        return res.status(400).json({ 
          error: 'Clinic with this website already exists' 
        });
      }
      
      const clinic = new Clinic({
        name,
        email: `${name.toLowerCase().replace(/\s+/g, '')}@example.com`,
        website,
        status,
        domains: [{ 
          domain: new URL(website).hostname, 
          verified: false,
          addedDate: new Date()
        }]
      });
      
      if (status === 'approved') {
        clinic.approvedDate = new Date();
        clinic.generateApiKey();
      }
      
      await clinic.save();
      
      // Also sync to memory store and cache for widget API fallback
      memoryStore.createOrUpdateClinic({
        clinicId: clinic.clinicId,
        name: clinic.name,
        website: clinic.website,
        status: clinic.status,
        logoVersion: clinic.logoVersion || 'standard'
      });
      
      // Save to file cache for widget API
      await ClinicCache.saveClinic(clinic);
      
      // Save to KV store for production reliability
      await kvStore.saveClinic(clinic);
      
      res.status(201).json({
        success: true,
        clinic: {
          clinicId: clinic.clinicId,
          name: clinic.name,
          status: clinic.status,
          apiKey: clinic.apiKey,
          embedCode: status === 'approved' 
            ? `<script src="${req.get('host').includes('vercel.app') ? 'https' : req.protocol}://${req.get('host')}/widget/logo/${clinic.clinicId}"></script>`
            : null
        }
      });
      
    } else {
      // Memory storage version
      const existingClinic = memoryStore.findClinicByEmailOrWebsite(null, website);
      
      if (existingClinic) {
        return res.status(400).json({ 
          error: 'Clinic with this website already exists' 
        });
      }
      
      const clinic = memoryStore.createClinic({
        name,
        website,
        status
      });
      
      res.status(201).json({
        success: true,
        clinic: {
          clinicId: clinic.clinicId,
          name: clinic.name,
          status: clinic.status,
          apiKey: clinic.apiKey,
          embedCode: status === 'approved' 
            ? `<script src="${req.get('host').includes('vercel.app') ? 'https' : req.protocol}://${req.get('host')}/widget/logo/${clinic.clinicId}"></script>`
            : null
        }
      });
    }
    
  } catch (error) {
    console.error('Manual clinic creation error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Update logo version
router.patch('/clinics/:clinicId/logo', authMiddleware, async (req, res) => {
  try {
    const { logoVersion } = req.body;
    
    const clinic = await Clinic.findOneAndUpdate(
      { clinicId: req.params.clinicId },
      { logoVersion },
      { new: true }
    );
    
    if (!clinic) {
      return res.status(404).json({ error: 'Clinic not found' });
    }
    
    res.json({ success: true, logoVersion: clinic.logoVersion });
    
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Delete clinic
router.delete('/clinics/:clinicId', authMiddleware, async (req, res) => {
  try {
    const { clinicId } = req.params;
    
    if (isMongoAvailable()) {
      const clinic = await Clinic.findOneAndDelete({ clinicId });
      
      if (!clinic) {
        return res.status(404).json({ error: 'Clinic not found' });
      }
      
      // Also remove from memory store and cache
      memoryStore.deleteClinic(clinicId);
      await ClinicCache.deleteClinic(clinicId);
      
      // Remove from KV store
      await kvStore.deleteClinic(clinicId);
      
      res.json({ 
        success: true, 
        message: `Clinic ${clinic.name} (${clinicId}) has been deleted` 
      });
    } else {
      const clinic = memoryStore.findClinic(clinicId);
      
      if (!clinic) {
        return res.status(404).json({ error: 'Clinic not found' });
      }
      
      const clinicName = clinic.name;
      const deleted = memoryStore.deleteClinic(clinicId);
      
      if (deleted) {
        res.json({ 
          success: true, 
          message: `Clinic ${clinicName} (${clinicId}) has been deleted` 
        });
      } else {
        res.status(500).json({ error: 'Failed to delete clinic' });
      }
    }
    
  } catch (error) {
    console.error('Delete clinic error:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;