const xrpl = require('xrpl');
const mongoose = require('mongoose');
const winston = require('winston');
const axios = require('axios');
const Property = require('../models/Property');
const SubscriptionService = require('./SubscriptionService');

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.json(),
  transports: [new winston.transports.Console()]
});

class TokenizationService {
  constructor() {
    this.client = new xrpl.Client(process.env.XRPL_SERVER || 'wss://s.altnet.rippletest.net:51233');
    this.initialize();
  }

  async initialize() {
    try {
      await this.client.connect();
      logger.info('XRPL client connected for tokenization');
    } catch (error) {
      logger.error('XRPL client initialization failed', { error: error.message });
      throw error;
    }
  }

  async tokenizeProperty(userId, propertyId, tokenCode, totalSupply) {
    try {
      // Check subscription limits
      const subscription = await SubscriptionService.getUserSubscription(userId, 'developer');
      const propertyCount = await Property.countDocuments({ developer: userId });
      if (propertyCount >= subscription.planDetails.propertyLimit) {
        throw new Error(`Property limit (${subscription.planDetails.propertyLimit}) reached for ${subscription.planDetails.name} plan`);
      }

      const property = await Property.findById(propertyId);
      if (!property) {
        throw new Error('Property not found');
      }

      // Verify documents with AI service
      const fraudAnalysis = await this.analyzeDocuments(property.documents);
      if (fraudAnalysis.isAnomaly) {
        property.fraudAnalysis = fraudAnalysis;
        await property.save();
        throw new Error('Potential fraud detected in documents');
      }

      // Create TrustSet transaction
      const issuerAddress = process.env.XRPL_ISSUER_ADDRESS || 'rIssuerAddress123'; // Mock issuer for beta
      const trustSet = {
        TransactionType: 'TrustSet',
        Account: issuerAddress,
        LimitAmount: {
          currency: tokenCode,
          issuer: issuerAddress,
          value: totalSupply.toString(),
        },
        Memos: [
          {
            Memo: {
              MemoType: xrpl.convertStringToHex('title_hash'),
              MemoData: xrpl.convertStringToHex(property.documents.titleDeed.ipfsHash || ''),
            },
          },
        ],
      };

      // Update property
      property.tokenCode = tokenCode;
      property.totalSupply = totalSupply;
      property.status = 'Tokenized';
      property.fraudAnalysis = fraudAnalysis;
      await property.save();

      logger.info('Property tokenized successfully', { propertyId, tokenCode });
      return { success: true, transaction: trustSet, property };
    } catch (error) {
      logger.error('Property tokenization failed', { propertyId, error: error.message });
      throw error;
    }
  }

  async analyzeDocuments(documents) {
    try {
      const response = await axios.post(`${process.env.AI_SERVICE_URL}/api/analyze-document`, {
        documents: {
          titleDeed: documents.titleDeed?.content || '',
          encumbranceCertificate: documents.encumbranceCertificate?.content || '',
        },
      });
      return response.data;
    } catch (error) {
      logger.error('Document analysis failed', { error: error.message });
      return {
        success: false,
        error: 'Document analysis failed',
        recommendation: 'Manual review required',
      };
    }
  }

  async disconnect() {
    if (this.client && this.client.isConnected()) {
      await this.client.disconnect();
      logger.info('XRPL client disconnected');
    }
  }
}

module.exports = new TokenizationService();