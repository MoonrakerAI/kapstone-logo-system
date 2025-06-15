const fs = require('fs');
const path = require('path');

// Use /tmp directory for Vercel serverless functions
const CACHE_FILE = '/tmp/clinic-cache.json';

class ClinicCache {
  
  // Write clinic data to cache file
  static async saveClinic(clinic) {
    try {
      let cache = {};
      
      // Read existing cache if it exists
      if (fs.existsSync(CACHE_FILE)) {
        const data = fs.readFileSync(CACHE_FILE, 'utf8');
        cache = JSON.parse(data);
      }
      
      // Update cache with clinic data
      cache[clinic.clinicId] = {
        clinicId: clinic.clinicId,
        name: clinic.name,
        website: clinic.website,
        status: clinic.status,
        logoVersion: clinic.logoVersion || 'standard',
        updatedAt: new Date().toISOString()
      };
      
      // Write back to file
      fs.writeFileSync(CACHE_FILE, JSON.stringify(cache, null, 2));
      console.log(`✅ Cached clinic: ${clinic.clinicId} (${clinic.status})`);
      
    } catch (error) {
      console.error('Error saving to clinic cache:', error.message);
    }
  }
  
  // Read clinic from cache
  static async getClinic(clinicId) {
    try {
      if (!fs.existsSync(CACHE_FILE)) {
        return null;
      }
      
      const data = fs.readFileSync(CACHE_FILE, 'utf8');
      const cache = JSON.parse(data);
      
      return cache[clinicId] || null;
      
    } catch (error) {
      console.error('Error reading from clinic cache:', error.message);
      return null;
    }
  }
  
  // Delete clinic from cache
  static async deleteClinic(clinicId) {
    try {
      if (!fs.existsSync(CACHE_FILE)) {
        return;
      }
      
      const data = fs.readFileSync(CACHE_FILE, 'utf8');
      const cache = JSON.parse(data);
      
      delete cache[clinicId];
      
      fs.writeFileSync(CACHE_FILE, JSON.stringify(cache, null, 2));
      console.log(`✅ Removed from cache: ${clinicId}`);
      
    } catch (error) {
      console.error('Error deleting from clinic cache:', error.message);
    }
  }
  
  // Get all clinics from cache
  static async getAllClinics() {
    try {
      if (!fs.existsSync(CACHE_FILE)) {
        return [];
      }
      
      const data = fs.readFileSync(CACHE_FILE, 'utf8');
      const cache = JSON.parse(data);
      
      return Object.values(cache);
      
    } catch (error) {
      console.error('Error reading all clinics from cache:', error.message);
      return [];
    }
  }
}

module.exports = ClinicCache;