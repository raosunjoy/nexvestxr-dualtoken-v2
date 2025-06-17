const Property = require('../models/Property');
const DatabaseManager = require('../config/database');
const AWS = require('aws-sdk');
const tf = require('@tensorflow/tfjs-node');

class PropertyService {
  constructor() {
    this.sagemaker = new AWS.SageMaker({ region: process.env.AWS_REGION || 'ap-south-1' });
    this.s3 = new AWS.S3({ region: process.env.AWS_REGION || 'ap-south-1' });
    this.textract = new AWS.Textract({ region: process.env.AWS_REGION || 'ap-south-1' });
    this.model = null;
    this.initializeAI();
  }

  async initializeAI() {
    try {
      const modelPath = process.env.AI_MODEL_PATH || './models/property-scoring';
      this.model = await tf.loadLayersModel(`file://${modelPath}/model.json`);
      console.log('AI model loaded successfully');
    } catch (error) {
      console.error('Failed to load AI model:', error);
    }
  }

  async updateSocialScore(propertyId, score) {
    try {
      const key = `social:property:${propertyId}`;
      await DatabaseManager.redisClient.hset(key, {
        confidenceScore: score.toString(),
        timestamp: Date.now().toString(),
        reviewCount: (await DatabaseManager.redisClient.hincrby(key, 'reviewCount', 1)).toString()
      });
      await DatabaseManager.redisClient.expire(key, 86400); // 24-hour TTL
      return true;
    } catch (error) {
      console.error('Failed to update social score:', error);
      return false;
    }
  }

  async getSocialScore(propertyId) {
    try {
      const key = `social:property:${propertyId}`;
      const data = await DatabaseManager.redisClient.hgetall(key);
      return {
        confidenceScore: parseFloat(data.confidenceScore) || 0,
        timestamp: parseInt(data.timestamp) || Date.now(),
        reviewCount: parseInt(data.reviewCount) || 0
      };
    } catch (error) {
      console.error('Failed to get social score:', error);
      return null;
    }
  }

  async createProperty(propertyData, documents) {
    try {
      const validatedData = await this.validatePropertyData(propertyData);
      const verificationResult = await this.verifyDocuments(documents);
      if (!verificationResult.isValid) {
        throw new Error(`Document verification failed: ${verificationResult.reason}`);
      }
      const documentHashes = await this.uploadDocuments(documents);
      const aiScore = await this.calculatePropertyScore(validatedData);
      const riskScore = await this.calculateRiskScore(validatedData, verificationResult);
      const liquidityScore = await this.calculateLiquidityScore(validatedData);
      const property = new Property({
        ...validatedData,
        id: this.generatePropertyId(),
        aiScore,
        riskScore,
        liquidityScore,
        verificationStatus: 'verified',
        documents: documentHashes,
        complianceChecks: {
          kycVerified: true,
          documentsVerified: true,
          aiVerified: true,
          complianceScore: verificationResult.complianceScore
        },
        status: 'active'
      });
      await property.save();
      await DatabaseManager.cacheSet(`property:${property.id}`, property.toObject(), 1800);
      await this.updateCityAggregations(property.city);
      return property;
    } catch (error) {
      console.error('Property creation failed:', error);
      throw error;
    }
  }

  // Existing methods (validatePropertyData, verifyDocuments, etc.) remain unchanged
}
module.exports = new PropertyService();