const express = require('express');
const path = require('path');
const fs = require('fs');
const router = express.Router();

// Serve logo images with proper CORS headers
router.get('/:filename', (req, res) => {
  try {
    const { filename } = req.params;
    
    // Security: only allow specific file extensions
    const allowedExtensions = ['.png', '.jpg', '.jpeg', '.svg'];
    const ext = path.extname(filename).toLowerCase();
    
    if (!allowedExtensions.includes(ext)) {
      return res.status(400).json({ error: 'Invalid file type' });
    }
    
    const logoPath = path.join(__dirname, '../../public/logos', filename);
    
    // Check if file exists
    if (!fs.existsSync(logoPath)) {
      return res.status(404).json({ error: 'Logo not found' });
    }
    
    // Set CORS headers explicitly
    res.set({
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Cache-Control': 'public, max-age=86400', // Cache for 1 day
    });
    
    // Set content type based on file extension
    const contentTypes = {
      '.png': 'image/png',
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.svg': 'image/svg+xml'
    };
    
    res.contentType(contentTypes[ext] || 'application/octet-stream');
    
    // Send the file
    res.sendFile(logoPath);
    
  } catch (error) {
    console.error('Logo serving error:', error);
    res.status(500).json({ error: 'Error serving logo' });
  }
});

module.exports = router;