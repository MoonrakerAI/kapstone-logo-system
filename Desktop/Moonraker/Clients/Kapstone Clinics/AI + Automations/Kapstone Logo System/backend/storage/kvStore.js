// Production-ready KV storage for Vercel deployment
// This uses environment variables to support both Vercel KV and local Redis

const CLINIC_PREFIX = 'clinic:';
const ALL_CLINICS_KEY = 'all_clinics';

class KVStore {
  constructor() {
    this.client = null;
    this.initPromise = null;
  }

  async init() {
    if (this.initPromise) return this.initPromise;
    
    this.initPromise = this._initClient();
    return this.initPromise;
  }

  async _initClient() {
    try {
      // First, try to use Vercel KV if available
      if (process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN) {
        console.log('Using Vercel KV for storage');
        const { createClient } = require('@vercel/kv');
        this.client = createClient({
          url: process.env.KV_REST_API_URL,
          token: process.env.KV_REST_API_TOKEN,
        });
        this.isVercelKV = true;
        return true;
      }
      
      // Fallback to Redis if available
      if (process.env.REDIS_URL) {
        console.log('Using Redis for storage');
        const { createClient } = require('redis');
        this.client = createClient({
          url: process.env.REDIS_URL
        });
        await this.client.connect();
        this.isVercelKV = false;
        return true;
      }
      
      console.log('No KV storage available - using memory fallback');
      // Simple in-memory fallback for local development
      this.client = new Map();
      this.isMemory = true;
      return true;
      
    } catch (error) {
      console.error('Failed to initialize KV client:', error);
      // Use memory fallback on error
      this.client = new Map();
      this.isMemory = true;
      return false;
    }
  }

  async get(key) {
    await this.init();
    
    if (this.isMemory) {
      return this.client.get(key) || null;
    }
    
    try {
      const value = await this.client.get(key);
      return value ? JSON.parse(value) : null;
    } catch (error) {
      console.error('KV get error:', error);
      return null;
    }
  }

  async set(key, value, options = {}) {
    await this.init();
    
    if (this.isMemory) {
      this.client.set(key, value);
      return 'OK';
    }
    
    try {
      const serialized = JSON.stringify(value);
      
      if (this.isVercelKV) {
        // Vercel KV syntax
        if (options.ex) {
          return await this.client.set(key, serialized, { ex: options.ex });
        }
        return await this.client.set(key, serialized);
      } else {
        // Redis syntax
        if (options.ex) {
          return await this.client.setEx(key, options.ex, serialized);
        }
        return await this.client.set(key, serialized);
      }
    } catch (error) {
      console.error('KV set error:', error);
      return null;
    }
  }

  async delete(key) {
    await this.init();
    
    if (this.isMemory) {
      return this.client.delete(key) ? 1 : 0;
    }
    
    try {
      return await this.client.del(key);
    } catch (error) {
      console.error('KV delete error:', error);
      return 0;
    }
  }

  // Clinic-specific methods
  async saveClinic(clinic) {
    const key = `${CLINIC_PREFIX}${clinic.clinicId}`;
    
    // Save individual clinic
    await this.set(key, {
      clinicId: clinic.clinicId,
      name: clinic.name,
      website: clinic.website,
      status: clinic.status,
      logoVersion: clinic.logoVersion || 'standard',
      approvedDate: clinic.approvedDate,
      impressions: clinic.impressions || 0,
      lastImpression: clinic.lastImpression,
      updatedAt: new Date().toISOString()
    });
    
    // Update the all clinics list
    const allClinics = await this.get(ALL_CLINICS_KEY) || [];
    const existingIndex = allClinics.findIndex(id => id === clinic.clinicId);
    
    if (existingIndex === -1) {
      allClinics.push(clinic.clinicId);
      await this.set(ALL_CLINICS_KEY, allClinics);
    }
    
    console.log(`✅ Saved clinic to KV: ${clinic.clinicId} (${clinic.status})`);
  }

  async getClinic(clinicId) {
    const key = `${CLINIC_PREFIX}${clinicId}`;
    return await this.get(key);
  }

  async deleteClinic(clinicId) {
    const key = `${CLINIC_PREFIX}${clinicId}`;
    
    // Delete individual clinic
    await this.delete(key);
    
    // Remove from all clinics list
    const allClinics = await this.get(ALL_CLINICS_KEY) || [];
    const filtered = allClinics.filter(id => id !== clinicId);
    await this.set(ALL_CLINICS_KEY, filtered);
    
    console.log(`✅ Deleted clinic from KV: ${clinicId}`);
  }

  async getAllClinics() {
    const clinicIds = await this.get(ALL_CLINICS_KEY) || [];
    const clinics = [];
    
    for (const clinicId of clinicIds) {
      const clinic = await this.getClinic(clinicId);
      if (clinic) {
        clinics.push(clinic);
      }
    }
    
    return clinics;
  }

  async incrementImpressions(clinicId) {
    const clinic = await this.getClinic(clinicId);
    if (clinic) {
      clinic.impressions = (clinic.impressions || 0) + 1;
      clinic.lastImpression = new Date().toISOString();
      await this.saveClinic(clinic);
    }
  }
}

// Export singleton instance
module.exports = new KVStore();