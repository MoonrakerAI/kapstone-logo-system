// Simple static store for widget-v2 that doesn't require MongoDB connection
const fs = require('fs');
const path = require('path');

class StaticStore {
  constructor() {
    // Use a simple JSON file in the project directory
    this.filePath = path.join(__dirname, '../..', 'clinic-data.json');
  }

  // Save clinic data to static file
  async saveClinic(clinic) {
    try {
      let data = {};
      
      // Read existing data if file exists
      if (fs.existsSync(this.filePath)) {
        const fileContent = fs.readFileSync(this.filePath, 'utf8');
        data = JSON.parse(fileContent);
      }
      
      // Add/update clinic
      data[clinic.clinicId] = {
        clinicId: clinic.clinicId,
        name: clinic.name,
        status: clinic.status,
        logoVersion: clinic.logoVersion || 'standard',
        updatedAt: new Date().toISOString()
      };
      
      // Write back to file
      fs.writeFileSync(this.filePath, JSON.stringify(data, null, 2));
      console.log(`✅ Static store: Saved clinic ${clinic.clinicId} with status ${clinic.status}`);
      
    } catch (error) {
      console.error('Static store save error:', error.message);
    }
  }

  // Get clinic from static file
  async getClinic(clinicId) {
    try {
      if (!fs.existsSync(this.filePath)) {
        return null;
      }
      
      const fileContent = fs.readFileSync(this.filePath, 'utf8');
      const data = JSON.parse(fileContent);
      
      return data[clinicId] || null;
      
    } catch (error) {
      console.error('Static store read error:', error.message);
      return null;
    }
  }

  // Delete clinic from static file
  async deleteClinic(clinicId) {
    try {
      if (!fs.existsSync(this.filePath)) {
        return;
      }
      
      const fileContent = fs.readFileSync(this.filePath, 'utf8');
      const data = JSON.parse(fileContent);
      
      delete data[clinicId];
      
      fs.writeFileSync(this.filePath, JSON.stringify(data, null, 2));
      console.log(`✅ Deleted from static store: ${clinicId}`);
      
    } catch (error) {
      console.error('Static store delete error:', error.message);
    }
  }
}

module.exports = new StaticStore();