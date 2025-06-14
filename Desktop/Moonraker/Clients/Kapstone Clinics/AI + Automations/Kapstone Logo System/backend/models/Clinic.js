const mongoose = require('mongoose');
const { v4: uuidv4 } = require('uuid');

const ClinicSchema = new mongoose.Schema({
  clinicId: {
    type: String,
    unique: true,
    required: true,
    default: () => `KC-${uuidv4().substring(0, 8).toUpperCase()}`
  },
  name: {
    type: String,
    required: true
  },
  email: {
    type: String,
    required: true,
    unique: true
  },
  website: {
    type: String,
    required: true
  },
  status: {
    type: String,
    enum: ['pending', 'approved', 'suspended', 'revoked'],
    default: 'pending'
  },
  approvedDate: Date,
  logoVersion: {
    type: String,
    default: 'standard'
  },
  apiKey: {
    type: String,
    unique: true,
    sparse: true
  },
  domains: [{
    domain: String,
    verified: Boolean,
    addedDate: Date
  }],
  impressions: {
    type: Number,
    default: 0
  },
  lastImpression: Date,
  metadata: {
    contactPerson: String,
    phone: String,
    address: String,
    certifications: [String],
    notes: String
  }
}, {
  timestamps: true
});

// Generate API key on approval
ClinicSchema.methods.generateApiKey = function() {
  this.apiKey = `kc_${uuidv4().replace(/-/g, '')}`;
  return this.apiKey;
};

module.exports = mongoose.model('Clinic', ClinicSchema);