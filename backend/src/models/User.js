const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  firstName: { type: String, required: false },
  lastName: { type: String, required: false },
  phone: { type: String, required: false },
  investorType: { 
    type: String, 
    enum: ['individual', 'institutional', 'developer'], 
    default: 'individual' 
  },
  kycLevel: { 
    type: String, 
    enum: ['none', 'basic', 'enhanced', 'premium'], 
    default: 'none' 
  },
  country: { type: String, required: false },
  nationality: { type: String, required: false },
  emiratesId: { type: String, required: false },
  role: { 
    type: String, 
    enum: ['user', 'admin', 'developer'], 
    default: 'user' 
  },
  xrplAddress: { type: String, required: false },
  flareAddress: { type: String, required: false },
  apiKey: { type: String, required: false },
  isActive: { type: Boolean, default: true },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

// Update the updatedAt field before saving
userSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

module.exports = mongoose.model('User', userSchema);

