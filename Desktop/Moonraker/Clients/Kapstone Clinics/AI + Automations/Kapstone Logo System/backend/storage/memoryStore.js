// In-memory storage for testing without MongoDB
const { v4: uuidv4 } = require('uuid');

class MemoryStore {
  constructor() {
    this.clinics = new Map();
    this.isConnected = false;
  }
  
  generateClinicId() {
    return `KC-${uuidv4().substring(0, 8).toUpperCase()}`;
  }
  
  generateApiKey() {
    return `kc_${uuidv4().replace(/-/g, '')}`;
  }
  
  createClinic(data) {
    try {
      // Extract domain safely
      let domain = data.website;
      try {
        domain = new URL(data.website).hostname;
      } catch (urlError) {
        // If URL parsing fails, just use the website as-is
        domain = data.website.replace(/^https?:\/\//, '').split('/')[0];
      }
      
      const clinic = {
        clinicId: this.generateClinicId(),
        name: data.name,
        email: data.email || `${data.name.toLowerCase().replace(/\s+/g, '')}@example.com`,
        website: data.website,
        status: data.status || 'approved',
        approvedDate: data.status === 'approved' ? new Date() : null,
        logoVersion: 'standard',
        apiKey: data.status === 'approved' ? this.generateApiKey() : null,
        domains: [{
          domain: domain,
          verified: false,
          addedDate: new Date()
        }],
        impressions: 0,
        lastImpression: null,
        metadata: {
          contactPerson: data.contactPerson || '',
          phone: data.phone || '',
          address: data.address || '',
          certifications: data.certifications || [],
          notes: ''
        },
        createdAt: new Date(),
        updatedAt: new Date()
      };
      
      this.clinics.set(clinic.clinicId, clinic);
      console.log(`✅ Created clinic: ${clinic.clinicId} - ${clinic.name}`);
      return clinic;
    } catch (error) {
      console.error('Error creating clinic:', error);
      throw error;
    }
  }
  
  findClinic(clinicId) {
    return this.clinics.get(clinicId) || null;
  }
  
  findClinicByEmailOrWebsite(email, website) {
    for (let clinic of this.clinics.values()) {
      if (clinic.email === email || clinic.website === website) {
        return clinic;
      }
    }
    return null;
  }
  
  updateClinicStatus(clinicId, status) {
    const clinic = this.clinics.get(clinicId);
    if (!clinic) return null;
    
    clinic.status = status;
    clinic.updatedAt = new Date();
    
    if (status === 'approved' && !clinic.apiKey) {
      clinic.approvedDate = new Date();
      clinic.apiKey = this.generateApiKey();
    }
    
    this.clinics.set(clinicId, clinic);
    return clinic;
  }
  
  incrementImpressions(clinicId) {
    const clinic = this.clinics.get(clinicId);
    if (!clinic) return null;
    
    clinic.impressions += 1;
    clinic.lastImpression = new Date();
    this.clinics.set(clinicId, clinic);
    return clinic;
  }
  
  getAllClinics(status = null) {
    let clinics = Array.from(this.clinics.values());
    
    if (status) {
      clinics = clinics.filter(c => c.status === status);
    }
    
    return clinics.sort((a, b) => b.createdAt - a.createdAt);
  }
  
  getStats() {
    const clinics = Array.from(this.clinics.values());
    
    return {
      total: clinics.length,
      approved: clinics.filter(c => c.status === 'approved').length,
      pending: clinics.filter(c => c.status === 'pending').length,
      suspended: clinics.filter(c => c.status === 'suspended').length,
      revoked: clinics.filter(c => c.status === 'revoked').length
    };
  }
  
  getTopClinics(limit = 10) {
    return Array.from(this.clinics.values())
      .filter(c => c.status === 'approved')
      .sort((a, b) => b.impressions - a.impressions)
      .slice(0, limit)
      .map(c => ({
        clinicId: c.clinicId,
        name: c.name,
        impressions: c.impressions,
        lastImpression: c.lastImpression
      }));
  }
  
  getRecentActivity(limit = 20) {
    return Array.from(this.clinics.values())
      .filter(c => c.lastImpression)
      .sort((a, b) => b.lastImpression - a.lastImpression)
      .slice(0, limit)
      .map(c => ({
        clinicId: c.clinicId,
        name: c.name,
        lastImpression: c.lastImpression,
        impressions: c.impressions
      }));
  }
  
  deleteClinic(clinicId) {
    const clinic = this.clinics.get(clinicId);
    if (!clinic) return false;
    
    const deleted = this.clinics.delete(clinicId);
    console.log(`✅ Deleted clinic from memory: ${clinicId} - ${clinic.name}`);
    return deleted;
  }
}

module.exports = new MemoryStore();