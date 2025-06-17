// NexVestXR Property Valuation Lambda Function
// Automated property valuation using external APIs and ML models

const AWS = require('aws-sdk');
const https = require('https');

// AWS clients
const dynamodb = new AWS.DynamoDB.DocumentClient();
const sns = new AWS.SNS();
const s3 = new AWS.S3();
const comprehend = new AWS.Comprehend();

// Configuration
const PROPERTIES_TABLE = process.env.PROPERTIES_TABLE;
const VALUATIONS_TABLE = process.env.VALUATIONS_TABLE;
const SNS_TOPIC_ARN = process.env.SNS_TOPIC_ARN;
const S3_BUCKET = process.env.S3_BUCKET;

class PropertyValuationService {
    constructor() {
        this.valuationSources = [
            'dubizzle',
            'bayut',
            'propertyfinder',
            'central_bank_ae'
        ];
    }

    // Main valuation process
    async valuateProperty(propertyId) {
        console.log(`Starting valuation for property: ${propertyId}`);

        try {
            // Get property details
            const property = await this.getPropertyDetails(propertyId);
            if (!property) {
                throw new Error(`Property not found: ${propertyId}`);
            }

            // Collect market data
            const marketData = await this.collectMarketData(property);

            // Perform valuation calculations
            const valuation = await this.calculateValuation(property, marketData);

            // Generate valuation report
            const report = await this.generateValuationReport(property, valuation, marketData);

            // Save valuation to database
            await this.saveValuation(propertyId, valuation, report);

            // Update property record
            await this.updatePropertyValuation(propertyId, valuation);

            // Send notification
            await this.notifyValuationComplete(propertyId, valuation);

            console.log(`Valuation completed for property: ${propertyId}`);
            return valuation;

        } catch (error) {
            console.error(`Valuation failed for property ${propertyId}:`, error);
            await this.notifyValuationError(propertyId, error.message);
            throw error;
        }
    }

    // Get property details from database
    async getPropertyDetails(propertyId) {
        try {
            const params = {
                TableName: PROPERTIES_TABLE,
                Key: {
                    propertyId: propertyId
                }
            };

            const result = await dynamodb.get(params).promise();
            return result.Item;

        } catch (error) {
            console.error('Error getting property details:', error);
            throw error;
        }
    }

    // Collect market data from various sources
    async collectMarketData(property) {
        console.log('Collecting market data...');

        const marketData = {
            comparableProperties: [],
            marketTrends: {},
            economicIndicators: {},
            timestamp: new Date().toISOString()
        };

        try {
            // Collect data from multiple sources in parallel
            const dataPromises = [
                this.getComparableProperties(property),
                this.getMarketTrends(property.location),
                this.getEconomicIndicators(),
                this.getCentralBankData()
            ];

            const [comparables, trends, economic, centralBank] = await Promise.allSettled(dataPromises);

            if (comparables.status === 'fulfilled') {
                marketData.comparableProperties = comparables.value;
            }

            if (trends.status === 'fulfilled') {
                marketData.marketTrends = trends.value;
            }

            if (economic.status === 'fulfilled') {
                marketData.economicIndicators = economic.value;
            }

            if (centralBank.status === 'fulfilled') {
                marketData.centralBankData = centralBank.value;
            }

            return marketData;

        } catch (error) {
            console.error('Error collecting market data:', error);
            return marketData;
        }
    }

    // Get comparable properties from real estate APIs
    async getComparableProperties(property) {
        console.log('Getting comparable properties...');

        const comparables = [];

        try {
            // Search parameters
            const searchParams = {
                location: property.location,
                propertyType: property.type,
                bedrooms: property.bedrooms,
                bathrooms: property.bathrooms,
                minArea: property.area * 0.8,
                maxArea: property.area * 1.2,
                radius: 2000 // 2km radius
            };

            // Get data from multiple sources
            const sources = ['dubizzle', 'bayut', 'propertyfinder'];

            for (const source of sources) {
                try {
                    const sourceComparables = await this.fetchFromSource(source, searchParams);
                    comparables.push(...sourceComparables);
                } catch (error) {
                    console.error(`Error fetching from ${source}:`, error);
                }
            }

            // Filter and sort comparables
            return this.filterComparables(comparables, property);

        } catch (error) {
            console.error('Error getting comparable properties:', error);
            return [];
        }
    }

    // Fetch data from specific source
    async fetchFromSource(source, searchParams) {
        // Mock implementation - in production, integrate with actual APIs
        return new Promise((resolve) => {
            setTimeout(() => {
                const mockData = this.generateMockComparables(source, searchParams);
                resolve(mockData);
            }, 1000);
        });
    }

    // Generate mock comparable data
    generateMockComparables(source, params) {
        const basePrice = 1000000; // AED 1M base price
        const count = Math.floor(Math.random() * 10) + 5;
        const comparables = [];

        for (let i = 0; i < count; i++) {
            const variation = (Math.random() - 0.5) * 0.4; // ±20% variation
            const price = basePrice * (1 + variation);
            const pricePerSqft = price / params.minArea;

            comparables.push({
                id: `${source}_${i + 1}`,
                source: source,
                price: Math.round(price),
                pricePerSqft: Math.round(pricePerSqft),
                area: params.minArea + Math.random() * (params.maxArea - params.minArea),
                bedrooms: params.bedrooms,
                bathrooms: params.bathrooms,
                location: params.location,
                listingDate: new Date(Date.now() - Math.random() * 90 * 24 * 60 * 60 * 1000).toISOString(),
                confidence: Math.random() * 0.3 + 0.7 // 0.7-1.0
            });
        }

        return comparables;
    }

    // Filter and validate comparable properties
    filterComparables(comparables, property) {
        return comparables
            .filter(comp => comp.confidence > 0.7)
            .filter(comp => Math.abs(comp.area - property.area) / property.area < 0.3)
            .sort((a, b) => b.confidence - a.confidence)
            .slice(0, 20); // Top 20 comparables
    }

    // Get market trends
    async getMarketTrends(location) {
        console.log('Getting market trends...');

        // Mock implementation
        return {
            priceGrowthYoY: Math.random() * 0.1 - 0.05, // ±5%
            priceGrowthQoQ: Math.random() * 0.03 - 0.015, // ±1.5%
            inventory: Math.floor(Math.random() * 1000) + 500,
            averageDaysOnMarket: Math.floor(Math.random() * 60) + 30,
            priceReduction: Math.random() * 0.1,
            location: location
        };
    }

    // Get economic indicators
    async getEconomicIndicators() {
        console.log('Getting economic indicators...');

        // Mock implementation
        return {
            gdpGrowth: Math.random() * 0.06 + 0.02, // 2-8%
            inflation: Math.random() * 0.04 + 0.01, // 1-5%
            interestRate: Math.random() * 0.03 + 0.02, // 2-5%
            unemploymentRate: Math.random() * 0.05 + 0.02, // 2-7%
            oilPrice: Math.random() * 20 + 70, // $70-90
            currencyExchange: {
                usdAed: 3.67 + (Math.random() - 0.5) * 0.1
            }
        };
    }

    // Get Central Bank of UAE data
    async getCentralBankData() {
        console.log('Getting Central Bank data...');

        // Mock implementation
        return {
            mortgageRates: {
                fixed: Math.random() * 0.02 + 0.03, // 3-5%
                variable: Math.random() * 0.02 + 0.025 // 2.5-4.5%
            },
            loanToValue: 0.8, // 80% max LTV
            bankLendingGrowth: Math.random() * 0.1 + 0.05, // 5-15%
            propertyTransactionVolume: Math.floor(Math.random() * 1000) + 2000
        };
    }

    // Calculate property valuation
    async calculateValuation(property, marketData) {
        console.log('Calculating valuation...');

        const valuation = {
            propertyId: property.propertyId,
            timestamp: new Date().toISOString(),
            methods: {},
            finalValue: 0,
            confidence: 0,
            priceRange: {},
            factors: {}
        };

        try {
            // Method 1: Comparable Sales Approach
            const comparableValue = this.calculateComparableValue(property, marketData.comparableProperties);
            valuation.methods.comparable = comparableValue;

            // Method 2: Income Approach (for rental properties)
            const incomeValue = this.calculateIncomeValue(property, marketData);
            valuation.methods.income = incomeValue;

            // Method 3: Cost Approach
            const costValue = this.calculateCostValue(property, marketData);
            valuation.methods.cost = costValue;

            // Weighted average of methods
            const weights = {
                comparable: 0.5,
                income: 0.3,
                cost: 0.2
            };

            valuation.finalValue = Math.round(
                comparableValue.value * weights.comparable +
                incomeValue.value * weights.income +
                costValue.value * weights.cost
            );

            // Calculate confidence score
            valuation.confidence = this.calculateConfidence(valuation.methods, marketData);

            // Calculate price range
            const uncertainty = (1 - valuation.confidence) * 0.2; // ±20% max uncertainty
            valuation.priceRange = {
                min: Math.round(valuation.finalValue * (1 - uncertainty)),
                max: Math.round(valuation.finalValue * (1 + uncertainty))
            };

            // Market adjustment factors
            valuation.factors = this.calculateAdjustmentFactors(marketData);

            return valuation;

        } catch (error) {
            console.error('Error calculating valuation:', error);
            throw error;
        }
    }

    // Calculate value using comparable sales
    calculateComparableValue(property, comparables) {
        if (comparables.length === 0) {
            return { value: 0, confidence: 0, method: 'comparable' };
        }

        // Calculate weighted average price per sqft
        let totalWeight = 0;
        let weightedPricePerSqft = 0;

        comparables.forEach(comp => {
            const weight = comp.confidence;
            weightedPricePerSqft += comp.pricePerSqft * weight;
            totalWeight += weight;
        });

        const avgPricePerSqft = weightedPricePerSqft / totalWeight;
        const value = avgPricePerSqft * property.area;

        // Adjustments for property-specific factors
        let adjustmentFactor = 1.0;

        // Age adjustment
        if (property.yearBuilt) {
            const age = new Date().getFullYear() - property.yearBuilt;
            adjustmentFactor *= Math.max(0.8, 1 - (age * 0.01)); // 1% per year depreciation, min 80%
        }

        // Condition adjustment
        if (property.condition) {
            const conditionMultipliers = {
                'excellent': 1.1,
                'good': 1.0,
                'fair': 0.9,
                'poor': 0.8
            };
            adjustmentFactor *= conditionMultipliers[property.condition] || 1.0;
        }

        return {
            value: Math.round(value * adjustmentFactor),
            confidence: Math.min(0.95, totalWeight / comparables.length),
            method: 'comparable',
            pricePerSqft: Math.round(avgPricePerSqft * adjustmentFactor),
            comparablesUsed: comparables.length
        };
    }

    // Calculate value using income approach
    calculateIncomeValue(property, marketData) {
        // Estimate rental income
        const estimatedRent = this.estimateRentalIncome(property, marketData);
        
        // Capitalization rate (typical for UAE real estate)
        const capRate = 0.06 + (Math.random() - 0.5) * 0.02; // 5-7%

        // Operating expenses (typically 20-30% of gross rent)
        const operatingExpenses = estimatedRent * 0.25;
        const netOperatingIncome = estimatedRent - operatingExpenses;

        const value = netOperatingIncome / capRate;

        return {
            value: Math.round(value),
            confidence: 0.7,
            method: 'income',
            grossRent: estimatedRent,
            netIncome: netOperatingIncome,
            capRate: capRate
        };
    }

    // Estimate rental income
    estimateRentalIncome(property, marketData) {
        // Base rent per sqft (typical UAE rates)
        const baseRentPerSqft = 100 + (Math.random() * 50); // AED 100-150 per sqft annually

        let rent = baseRentPerSqft * property.area;

        // Location adjustments
        const locationMultipliers = {
            'Dubai Marina': 1.3,
            'Downtown Dubai': 1.4,
            'Jumeirah': 1.2,
            'Dubai Hills': 1.1,
            'default': 1.0
        };

        const multiplier = locationMultipliers[property.location] || locationMultipliers.default;
        rent *= multiplier;

        return Math.round(rent);
    }

    // Calculate value using cost approach
    calculateCostValue(property, marketData) {
        // Land value (estimated)
        const landValuePerSqft = 500 + (Math.random() * 300); // AED 500-800 per sqft
        const landValue = landValuePerSqft * (property.plotArea || property.area);

        // Construction cost
        const constructionCostPerSqft = 800 + (Math.random() * 400); // AED 800-1200 per sqft
        const constructionCost = constructionCostPerSqft * property.area;

        // Depreciation
        const age = property.yearBuilt ? new Date().getFullYear() - property.yearBuilt : 5;
        const depreciation = Math.min(0.5, age * 0.02); // 2% per year, max 50%

        const depreciatedConstructionCost = constructionCost * (1 - depreciation);
        const value = landValue + depreciatedConstructionCost;

        return {
            value: Math.round(value),
            confidence: 0.6,
            method: 'cost',
            landValue: Math.round(landValue),
            constructionCost: Math.round(constructionCost),
            depreciation: depreciation
        };
    }

    // Calculate confidence score
    calculateConfidence(methods, marketData) {
        let confidence = 0;
        let weight = 0;

        // Weight by number of comparables
        if (marketData.comparableProperties.length > 10) {
            confidence += 0.4;
        } else if (marketData.comparableProperties.length > 5) {
            confidence += 0.3;
        } else {
            confidence += 0.2;
        }

        // Weight by data recency
        const avgAge = this.calculateAverageDataAge(marketData.comparableProperties);
        if (avgAge < 30) {
            confidence += 0.3;
        } else if (avgAge < 90) {
            confidence += 0.2;
        } else {
            confidence += 0.1;
        }

        // Weight by method agreement
        const values = [methods.comparable.value, methods.income.value, methods.cost.value];
        const variance = this.calculateVariance(values);
        const cv = Math.sqrt(variance) / this.calculateMean(values); // Coefficient of variation

        if (cv < 0.1) {
            confidence += 0.3;
        } else if (cv < 0.2) {
            confidence += 0.2;
        } else {
            confidence += 0.1;
        }

        return Math.min(0.95, confidence);
    }

    // Calculate average data age in days
    calculateAverageDataAge(comparables) {
        if (comparables.length === 0) return 365;

        const totalAge = comparables.reduce((sum, comp) => {
            const age = (Date.now() - new Date(comp.listingDate).getTime()) / (24 * 60 * 60 * 1000);
            return sum + age;
        }, 0);

        return totalAge / comparables.length;
    }

    // Calculate variance
    calculateVariance(values) {
        const mean = this.calculateMean(values);
        const squaredDiffs = values.map(value => Math.pow(value - mean, 2));
        return this.calculateMean(squaredDiffs);
    }

    // Calculate mean
    calculateMean(values) {
        return values.reduce((sum, value) => sum + value, 0) / values.length;
    }

    // Calculate market adjustment factors
    calculateAdjustmentFactors(marketData) {
        const factors = {};

        // Market trend adjustment
        if (marketData.marketTrends.priceGrowthYoY > 0.03) {
            factors.marketTrend = 'positive_strong';
            factors.marketAdjustment = 1.05;
        } else if (marketData.marketTrends.priceGrowthYoY > 0) {
            factors.marketTrend = 'positive_moderate';
            factors.marketAdjustment = 1.02;
        } else if (marketData.marketTrends.priceGrowthYoY > -0.03) {
            factors.marketTrend = 'stable';
            factors.marketAdjustment = 1.0;
        } else {
            factors.marketTrend = 'negative';
            factors.marketAdjustment = 0.95;
        }

        // Economic indicators
        if (marketData.economicIndicators.gdpGrowth > 0.05) {
            factors.economicOutlook = 'positive';
        } else if (marketData.economicIndicators.gdpGrowth > 0.02) {
            factors.economicOutlook = 'stable';
        } else {
            factors.economicOutlook = 'cautious';
        }

        return factors;
    }

    // Generate valuation report
    async generateValuationReport(property, valuation, marketData) {
        console.log('Generating valuation report...');

        const report = {
            propertyId: property.propertyId,
            reportDate: new Date().toISOString(),
            valuation: valuation,
            property: property,
            marketData: {
                comparablesCount: marketData.comparableProperties.length,
                marketTrends: marketData.marketTrends,
                economicIndicators: marketData.economicIndicators
            },
            methodology: this.getMethodologyDescription(),
            disclaimer: this.getDisclaimer(),
            validityPeriod: '90 days'
        };

        // Save report to S3
        try {
            const reportKey = `valuation-reports/${property.propertyId}/${Date.now()}.json`;
            
            await s3.putObject({
                Bucket: S3_BUCKET,
                Key: reportKey,
                Body: JSON.stringify(report, null, 2),
                ContentType: 'application/json',
                Metadata: {
                    propertyId: property.propertyId,
                    valuationAmount: valuation.finalValue.toString(),
                    reportDate: new Date().toISOString()
                }
            }).promise();

            report.s3Location = `s3://${S3_BUCKET}/${reportKey}`;

        } catch (error) {
            console.error('Error saving report to S3:', error);
        }

        return report;
    }

    // Get methodology description
    getMethodologyDescription() {
        return {
            comparableApproach: 'Analysis of recent sales of similar properties in the area, adjusted for differences in size, condition, and location.',
            incomeApproach: 'Valuation based on the property\'s income-generating potential using market rental rates and capitalization rates.',
            costApproach: 'Estimation based on the cost to replace the property, accounting for land value and depreciation.',
            finalValue: 'Weighted average of all three approaches, with emphasis on the most reliable method based on available data.'
        };
    }

    // Get disclaimer
    getDisclaimer() {
        return 'This valuation is an estimate based on available market data and automated analysis. It should not be considered as a formal appraisal and is subject to market conditions, property condition, and other factors that may affect actual market value. Professional appraisal is recommended for financing or legal purposes.';
    }

    // Save valuation to database
    async saveValuation(propertyId, valuation, report) {
        try {
            const params = {
                TableName: VALUATIONS_TABLE,
                Item: {
                    propertyId: propertyId,
                    valuationId: `VAL_${Date.now()}`,
                    timestamp: valuation.timestamp,
                    value: valuation.finalValue,
                    confidence: valuation.confidence,
                    priceRange: valuation.priceRange,
                    methods: valuation.methods,
                    factors: valuation.factors,
                    reportLocation: report.s3Location,
                    validUntil: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString(), // 90 days
                    status: 'active'
                }
            };

            await dynamodb.put(params).promise();
            console.log(`Valuation saved for property: ${propertyId}`);

        } catch (error) {
            console.error('Error saving valuation:', error);
            throw error;
        }
    }

    // Update property record with latest valuation
    async updatePropertyValuation(propertyId, valuation) {
        try {
            const params = {
                TableName: PROPERTIES_TABLE,
                Key: {
                    propertyId: propertyId
                },
                UpdateExpression: 'SET currentValuation = :valuation, lastValuationDate = :date, valuationHistory = list_append(if_not_exists(valuationHistory, :empty_list), :new_valuation)',
                ExpressionAttributeValues: {
                    ':valuation': valuation.finalValue,
                    ':date': valuation.timestamp,
                    ':empty_list': [],
                    ':new_valuation': [{
                        value: valuation.finalValue,
                        date: valuation.timestamp,
                        confidence: valuation.confidence
                    }]
                }
            };

            await dynamodb.update(params).promise();
            console.log(`Property valuation updated: ${propertyId}`);

        } catch (error) {
            console.error('Error updating property valuation:', error);
            throw error;
        }
    }

    // Send notification
    async notifyValuationComplete(propertyId, valuation) {
        try {
            const message = {
                type: 'VALUATION_COMPLETE',
                propertyId: propertyId,
                value: valuation.finalValue,
                confidence: valuation.confidence,
                priceRange: valuation.priceRange,
                timestamp: valuation.timestamp
            };

            const params = {
                TopicArn: SNS_TOPIC_ARN,
                Message: JSON.stringify(message),
                Subject: `Property Valuation Complete - ${propertyId}`,
                MessageAttributes: {
                    propertyId: {
                        DataType: 'String',
                        StringValue: propertyId
                    },
                    valuationAmount: {
                        DataType: 'Number',
                        StringValue: valuation.finalValue.toString()
                    }
                }
            };

            await sns.publish(params).promise();

        } catch (error) {
            console.error('Error sending notification:', error);
        }
    }

    // Send error notification
    async notifyValuationError(propertyId, errorMessage) {
        try {
            const params = {
                TopicArn: SNS_TOPIC_ARN,
                Message: `Valuation failed for property ${propertyId}: ${errorMessage}`,
                Subject: `Valuation Error - ${propertyId}`,
                MessageAttributes: {
                    propertyId: {
                        DataType: 'String',
                        StringValue: propertyId
                    },
                    errorType: {
                        DataType: 'String',
                        StringValue: 'VALUATION_ERROR'
                    }
                }
            };

            await sns.publish(params).promise();

        } catch (error) {
            console.error('Error sending error notification:', error);
        }
    }
}

// Lambda handler
exports.handler = async (event, context) => {
    console.log('Starting property valuation Lambda');
    console.log('Event:', JSON.stringify(event, null, 2));

    const valuationService = new PropertyValuationService();

    try {
        let results = [];

        // Handle different event sources
        if (event.Records) {
            // SQS or SNS event
            for (const record of event.Records) {
                let propertyId;

                if (record.eventSource === 'aws:sqs') {
                    const body = JSON.parse(record.body);
                    propertyId = body.propertyId;
                } else if (record.Sns) {
                    const message = JSON.parse(record.Sns.Message);
                    propertyId = message.propertyId;
                }

                if (propertyId) {
                    const valuation = await valuationService.valuateProperty(propertyId);
                    results.push({
                        propertyId: propertyId,
                        valuation: valuation
                    });
                }
            }
        } else if (event.propertyId) {
            // Direct invocation
            const valuation = await valuationService.valuateProperty(event.propertyId);
            results.push({
                propertyId: event.propertyId,
                valuation: valuation
            });
        } else {
            throw new Error('No property ID provided in event');
        }

        return {
            statusCode: 200,
            body: JSON.stringify({
                message: 'Property valuation completed successfully',
                results: results,
                timestamp: new Date().toISOString()
            })
        };

    } catch (error) {
        console.error('Property valuation error:', error);

        return {
            statusCode: 500,
            body: JSON.stringify({
                error: 'Property valuation failed',
                message: error.message,
                timestamp: new Date().toISOString()
            })
        };
    }
};