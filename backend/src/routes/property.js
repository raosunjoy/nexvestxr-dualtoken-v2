const express = require('express');
const { authenticateToken } = require('../middleware/auth');
const TokenizationService = require('../services/TokenizationService');
const Property = require('../models/Property');
const winston = require('winston');

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.json(),
  transports: [new winston.transports.Console()]
});

const router = express.Router();

// Create a new property
router.post('/', authenticateToken, async (req, res) => {
  try {
    const { name, location, totalValue, propertyType, expectedROI, documents } = req.body;
    const userId = req.user.id;

    const propertyId = `PROP_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const property = new Property({
      propertyId,
      name,
      location,
      totalValue,
      propertyType,
      expectedROI,
      developer: userId,
      documents,
    });

    await property.save();
    res.status(201).json({ success: true, property });
  } catch (error) {
    logger.error('Property creation failed', { userId: req.user.id, error: error.message });
    res.status(500).json({ error: 'Property creation failed', details: error.message });
  }
});

// Get all properties
router.get('/', authenticateToken, async (req, res) => {
  try {
    const properties = await Property.find({ developer: req.user.id });
    res.json({ success: true, properties });
  } catch (error) {
    logger.error('Property fetch failed', { userId: req.user.id, error: error.message });
    res.status(500).json({ error: 'Property fetch failed', details: error.message });
  }
});

// Get a single property
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const property = await Property.findById(req.params.id);
    if (!property) {
      return res.status(404).json({ error: 'Property not found' });
    }
    res.json({ success: true, property });
  } catch (error) {
    logger.error('Property fetch failed', { userId: req.user.id, error: error.message });
    res.status(500).json({ error: 'Property fetch failed', details: error.message });
  }
});

// Update a property
router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const updates = req.body;
    const property = await Property.findByIdAndUpdate(req.params.id, updates, { new: true });
    if (!property) {
      return res.status(404).json({ error: 'Property not found' });
    }
    res.json({ success: true, property });
  } catch (error) {
    logger.error('Property update failed', { userId: req.user.id, error: error.message });
    res.status(500).json({ error: 'Property update failed', details: error.message });
  }
});

// Tokenize a property
router.post('/:id/tokenize', authenticateToken, async (req, res) => {
  try {
    const { tokenCode, totalSupply } = req.body;
    const userId = req.user.id;
    const propertyId = req.params.id;

    const result = await TokenizationService.tokenizeProperty(userId, propertyId, tokenCode, totalSupply);
    res.json({ success: true, transaction: result.transaction, property: result.property });
  } catch (error) {
    logger.error('Property tokenization failed', { userId: req.user.id, error: error.message });
    res.status(500).json({ error: 'Property tokenization failed', details: error.message });
  }
});

module.exports = router;