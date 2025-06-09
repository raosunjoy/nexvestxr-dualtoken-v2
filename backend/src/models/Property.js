const mongoose = require('mongoose');

const documentSchema = new mongoose.Schema({
  ipfsHash: { type: String, required: true },
  content: { type: String }, // Base64 encoded content for AI analysis
  verified: { type: Boolean, default: false },
});

const fraudAnalysisSchema = new mongoose.Schema({
  success: { type: Boolean, default: false },
  isAnomaly: { type: Boolean, default: false },
  confidence: { type: Number },
  risks: [String],
  recommendation: { type: String },
  note: { type: String },
  analyzedAt: { type: Date, default: Date.now },
});

const propertySchema = new mongoose.Schema({
  propertyId: { type: String, unique: true, required: true },
  tokenCode: { type: String, unique: true },
  name: { type: String, required: true },
  location: { type: String, required: true },
  totalValue: { type: Number, required: true },
  totalSupply: { type: Number },
  tokensSold: { type: Number, default: 0 },
  status: { type: String, enum: ['Draft', 'Tokenized', 'Active', 'Sold'], default: 'Draft' },
  propertyType: { type: String, enum: ['Residential', 'Commercial', 'Land'], required: true },
  expectedROI: { type: Number },
  developer: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  documents: {
    titleDeed: documentSchema,
    encumbranceCertificate: documentSchema,
    approvals: documentSchema,
  },
  fraudAnalysis: fraudAnalysisSchema,
  fraudAnalysisHistory: [fraudAnalysisSchema],
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model('Property', propertySchema);