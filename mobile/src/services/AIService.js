import AsyncStorage from '@react-native-async-storage/async-storage';
import config from '../config';
import { apiService } from './ApiService';

class AIService {
  constructor() {
    this.baseURL = config.AI_SERVICE_URL;
    this.isHealthy = false;
    this.listeners = [];
    this.analysisCache = new Map();
    this.maxCacheSize = 50;
  }

  // Event listener management
  addListener(listener) {
    this.listeners.push(listener);
  }

  removeListener(listener) {
    this.listeners = this.listeners.filter(l => l !== listener);
  }

  notifyListeners(event, data) {
    this.listeners.forEach(listener => listener(event, data));
  }

  // Check AI service health
  async checkHealth() {
    try {
      const response = await fetch(`${this.baseURL}${config.ENDPOINTS.AI_HEALTH}`, {
        method: 'GET',
        timeout: config.TIMEOUTS.API_REQUEST,
      });

      if (response.ok) {
        const data = await response.json();
        this.isHealthy = data.status === 'healthy';
        return {
          success: true,
          healthy: this.isHealthy,
          data,
        };
      } else {
        this.isHealthy = false;
        return {
          success: false,
          message: 'AI service health check failed',
        };
      }
    } catch (error) {
      console.error('AI service health check error:', error);
      this.isHealthy = false;
      return {
        success: false,
        message: error.message || 'AI service unreachable',
      };
    }
  }

  // Analyze document
  async analyzeDocument(file, analysisType = 'property_analysis', options = {}) {
    try {
      // Check cache first
      const cacheKey = this.generateCacheKey(file, analysisType, options);
      if (this.analysisCache.has(cacheKey)) {
        console.log('Returning cached analysis result');
        return this.analysisCache.get(cacheKey);
      }

      this.notifyListeners('analysis_started', {
        fileName: file.name,
        analysisType,
      });

      // Prepare form data
      const formData = new FormData();
      formData.append('file', {
        uri: file.uri,
        type: file.type,
        name: file.name,
      });
      formData.append('analysis_type', analysisType);
      formData.append('options', JSON.stringify(options));

      // Make request to AI service
      const response = await fetch(`${this.baseURL}${config.ENDPOINTS.AI_ANALYZE_DOCUMENT}`, {
        method: 'POST',
        body: formData,
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        timeout: config.TIMEOUTS.FILE_UPLOAD,
      });

      if (!response.ok) {
        throw new Error(`AI service error: ${response.status}`);
      }

      const result = await response.json();

      if (result.success) {
        // Cache the result
        this.cacheResult(cacheKey, result);

        this.notifyListeners('analysis_completed', {
          fileName: file.name,
          analysisType,
          result: result.data,
        });

        return {
          success: true,
          data: result.data,
        };
      } else {
        throw new Error(result.message || 'Document analysis failed');
      }
    } catch (error) {
      console.error('Document analysis error:', error);
      this.notifyListeners('analysis_failed', {
        fileName: file.name,
        error: error.message,
      });
      return {
        success: false,
        message: error.message || 'Document analysis failed',
      };
    }
  }

  // Analyze property documents
  async analyzePropertyDocuments(documents, propertyId = null) {
    try {
      const analyses = [];
      const errors = [];

      this.notifyListeners('bulk_analysis_started', {
        documentCount: documents.length,
        propertyId,
      });

      // Process documents in parallel (with concurrency limit)
      const concurrencyLimit = 3;
      const chunks = this.chunkArray(documents, concurrencyLimit);

      for (const chunk of chunks) {
        const promises = chunk.map(async (document) => {
          try {
            const result = await this.analyzeDocument(document, 'property_analysis', {
              propertyId,
              extractFinancials: true,
              extractLegal: true,
              extractPhysical: true,
            });

            if (result.success) {
              return {
                document: document.name,
                analysis: result.data,
              };
            } else {
              errors.push({
                document: document.name,
                error: result.message,
              });
              return null;
            }
          } catch (error) {
            errors.push({
              document: document.name,
              error: error.message,
            });
            return null;
          }
        });

        const chunkResults = await Promise.all(promises);
        analyses.push(...chunkResults.filter(result => result !== null));
      }

      // Compile comprehensive analysis
      const comprehensiveAnalysis = this.compilePropertyAnalysis(analyses);

      this.notifyListeners('bulk_analysis_completed', {
        analysisCount: analyses.length,
        errorCount: errors.length,
        comprehensiveAnalysis,
      });

      return {
        success: true,
        data: {
          individualAnalyses: analyses,
          comprehensiveAnalysis,
          errors,
          summary: {
            totalDocuments: documents.length,
            successfulAnalyses: analyses.length,
            failedAnalyses: errors.length,
          },
        },
      };
    } catch (error) {
      console.error('Bulk document analysis error:', error);
      return {
        success: false,
        message: error.message || 'Bulk document analysis failed',
      };
    }
  }

  // Extract property valuation
  async extractPropertyValuation(documents) {
    try {
      const valuationData = {
        estimatedValue: null,
        valuationMethod: null,
        lastValuationDate: null,
        comparableProperties: [],
        marketAnalysis: null,
        confidence: 0,
      };

      for (const document of documents) {
        const analysis = await this.analyzeDocument(document, 'valuation_extraction', {
          extractComparables: true,
          extractMarketData: true,
        });

        if (analysis.success && analysis.data.valuation) {
          const docValuation = analysis.data.valuation;
          
          // Use the most recent and confident valuation
          if (docValuation.confidence > valuationData.confidence) {
            valuationData.estimatedValue = docValuation.estimatedValue;
            valuationData.valuationMethod = docValuation.method;
            valuationData.lastValuationDate = docValuation.date;
            valuationData.confidence = docValuation.confidence;
          }

          // Collect comparable properties
          if (docValuation.comparables) {
            valuationData.comparableProperties.push(...docValuation.comparables);
          }

          // Merge market analysis
          if (docValuation.marketAnalysis) {
            valuationData.marketAnalysis = docValuation.marketAnalysis;
          }
        }
      }

      return {
        success: true,
        data: valuationData,
      };
    } catch (error) {
      console.error('Property valuation extraction error:', error);
      return {
        success: false,
        message: error.message || 'Property valuation extraction failed',
      };
    }
  }

  // Extract legal information
  async extractLegalInfo(documents) {
    try {
      const legalInfo = {
        ownership: null,
        liens: [],
        restrictions: [],
        zoning: null,
        permits: [],
        compliance: {
          building: null,
          environmental: null,
          fire: null,
        },
      };

      for (const document of documents) {
        const analysis = await this.analyzeDocument(document, 'legal_extraction');

        if (analysis.success && analysis.data.legal) {
          const docLegal = analysis.data.legal;

          if (docLegal.ownership) {
            legalInfo.ownership = docLegal.ownership;
          }

          if (docLegal.liens) {
            legalInfo.liens.push(...docLegal.liens);
          }

          if (docLegal.restrictions) {
            legalInfo.restrictions.push(...docLegal.restrictions);
          }

          if (docLegal.zoning) {
            legalInfo.zoning = docLegal.zoning;
          }

          if (docLegal.permits) {
            legalInfo.permits.push(...docLegal.permits);
          }

          if (docLegal.compliance) {
            Object.assign(legalInfo.compliance, docLegal.compliance);
          }
        }
      }

      return {
        success: true,
        data: legalInfo,
      };
    } catch (error) {
      console.error('Legal information extraction error:', error);
      return {
        success: false,
        message: error.message || 'Legal information extraction failed',
      };
    }
  }

  // Extract financial information
  async extractFinancialInfo(documents) {
    try {
      const financialInfo = {
        income: {
          rental: [],
          other: [],
          total: 0,
        },
        expenses: {
          operational: [],
          maintenance: [],
          taxes: [],
          insurance: [],
          total: 0,
        },
        netOperatingIncome: 0,
        cashFlow: 0,
        capRate: null,
        debtService: [],
      };

      for (const document of documents) {
        const analysis = await this.analyzeDocument(document, 'financial_extraction');

        if (analysis.success && analysis.data.financial) {
          const docFinancial = analysis.data.financial;

          // Merge income data
          if (docFinancial.income) {
            if (docFinancial.income.rental) {
              financialInfo.income.rental.push(...docFinancial.income.rental);
            }
            if (docFinancial.income.other) {
              financialInfo.income.other.push(...docFinancial.income.other);
            }
          }

          // Merge expense data
          if (docFinancial.expenses) {
            Object.keys(docFinancial.expenses).forEach(category => {
              if (financialInfo.expenses[category] && Array.isArray(docFinancial.expenses[category])) {
                financialInfo.expenses[category].push(...docFinancial.expenses[category]);
              }
            });
          }

          // Update calculated fields
          if (docFinancial.netOperatingIncome) {
            financialInfo.netOperatingIncome = docFinancial.netOperatingIncome;
          }

          if (docFinancial.capRate) {
            financialInfo.capRate = docFinancial.capRate;
          }

          if (docFinancial.debtService) {
            financialInfo.debtService.push(...docFinancial.debtService);
          }
        }
      }

      // Calculate totals
      financialInfo.income.total = this.calculateTotal([
        ...financialInfo.income.rental,
        ...financialInfo.income.other,
      ]);

      Object.keys(financialInfo.expenses).forEach(category => {
        if (Array.isArray(financialInfo.expenses[category])) {
          const categoryTotal = this.calculateTotal(financialInfo.expenses[category]);
          financialInfo.expenses.total += categoryTotal;
        }
      });

      financialInfo.cashFlow = financialInfo.income.total - financialInfo.expenses.total;

      return {
        success: true,
        data: financialInfo,
      };
    } catch (error) {
      console.error('Financial information extraction error:', error);
      return {
        success: false,
        message: error.message || 'Financial information extraction failed',
      };
    }
  }

  // Get analysis history
  async getAnalysisHistory(propertyId = null, limit = 20, offset = 0) {
    try {
      const params = { limit, offset };
      if (propertyId) {
        params.propertyId = propertyId;
      }

      const response = await apiService.get('/api/ai/analysis-history', params);

      if (response.success) {
        return {
          success: true,
          data: response.data,
        };
      } else {
        throw new Error(response.message);
      }
    } catch (error) {
      console.error('Get analysis history error:', error);
      return {
        success: false,
        message: error.message || 'Failed to get analysis history',
      };
    }
  }

  // Generate cache key
  generateCacheKey(file, analysisType, options) {
    const fileSignature = `${file.name}_${file.size}_${file.lastModified || ''}`;
    const optionsSignature = JSON.stringify(options);
    return `${analysisType}_${fileSignature}_${optionsSignature}`;
  }

  // Cache analysis result
  cacheResult(key, result) {
    // Implement LRU cache behavior
    if (this.analysisCache.size >= this.maxCacheSize) {
      const firstKey = this.analysisCache.keys().next().value;
      this.analysisCache.delete(firstKey);
    }
    
    this.analysisCache.set(key, result);
  }

  // Clear cache
  clearCache() {
    this.analysisCache.clear();
  }

  // Compile comprehensive property analysis
  compilePropertyAnalysis(individualAnalyses) {
    const comprehensive = {
      summary: {
        totalDocuments: individualAnalyses.length,
        documentTypes: new Set(),
        analysisDate: new Date().toISOString(),
      },
      risks: [],
      opportunities: [],
      recommendations: [],
      confidence: 0,
    };

    let totalConfidence = 0;

    individualAnalyses.forEach(analysis => {
      if (analysis.analysis.documentType) {
        comprehensive.summary.documentTypes.add(analysis.analysis.documentType);
      }

      if (analysis.analysis.risks) {
        comprehensive.risks.push(...analysis.analysis.risks);
      }

      if (analysis.analysis.opportunities) {
        comprehensive.opportunities.push(...analysis.analysis.opportunities);
      }

      if (analysis.analysis.recommendations) {
        comprehensive.recommendations.push(...analysis.analysis.recommendations);
      }

      if (analysis.analysis.confidence) {
        totalConfidence += analysis.analysis.confidence;
      }
    });

    comprehensive.summary.documentTypes = Array.from(comprehensive.summary.documentTypes);
    comprehensive.confidence = individualAnalyses.length > 0 ? totalConfidence / individualAnalyses.length : 0;

    // Deduplicate and prioritize risks/opportunities/recommendations
    comprehensive.risks = this.deduplicateAndPrioritize(comprehensive.risks);
    comprehensive.opportunities = this.deduplicateAndPrioritize(comprehensive.opportunities);
    comprehensive.recommendations = this.deduplicateAndPrioritize(comprehensive.recommendations);

    return comprehensive;
  }

  // Utility functions
  chunkArray(array, chunkSize) {
    const chunks = [];
    for (let i = 0; i < array.length; i += chunkSize) {
      chunks.push(array.slice(i, i + chunkSize));
    }
    return chunks;
  }

  calculateTotal(items) {
    return items.reduce((total, item) => {
      return total + (typeof item === 'object' ? item.amount || 0 : item || 0);
    }, 0);
  }

  deduplicateAndPrioritize(items) {
    const seen = new Set();
    const unique = items.filter(item => {
      const key = typeof item === 'object' ? item.text || item.description : item;
      if (seen.has(key)) {
        return false;
      }
      seen.add(key);
      return true;
    });

    // Sort by priority if available
    return unique.sort((a, b) => {
      const aPriority = typeof a === 'object' ? a.priority || 0 : 0;
      const bPriority = typeof b === 'object' ? b.priority || 0 : 0;
      return bPriority - aPriority;
    });
  }
}

// Create and export singleton instance
export const aiService = new AIService();
export default aiService;