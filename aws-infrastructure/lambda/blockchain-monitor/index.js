// NexVestXR Blockchain Monitor Lambda Function
// Monitors XRPL and Flare networks for transaction events

const AWS = require('aws-sdk');
const https = require('https');

// AWS clients
const sns = AWS.SNS();
const dynamodb = new AWS.DynamoDB.DocumentClient();
const secretsManager = new AWS.SecretsManager();

// Configuration
const XRPL_WEBSOCKET_URL = 'wss://xrplcluster.com';
const FLARE_RPC_URL = process.env.FLARE_RPC_URL;
const SNS_TOPIC_ARN = process.env.SNS_TOPIC_ARN;
const MONITORING_TABLE = process.env.MONITORING_TABLE;

class BlockchainMonitor {
    constructor() {
        this.xrplConnection = null;
        this.lastProcessedLedger = 0;
        this.monitoredAddresses = new Set();
    }

    // Initialize monitoring
    async initialize() {
        console.log('Initializing blockchain monitor...');
        
        // Load monitored addresses from DynamoDB
        await this.loadMonitoredAddresses();
        
        // Get last processed ledger
        await this.getLastProcessedLedger();
        
        console.log(`Monitoring ${this.monitoredAddresses.size} addresses`);
        console.log(`Last processed ledger: ${this.lastProcessedLedger}`);
    }

    // Load addresses to monitor from DynamoDB
    async loadMonitoredAddresses() {
        try {
            const params = {
                TableName: MONITORING_TABLE,
                IndexName: 'StatusIndex',
                KeyConditionExpression: '#status = :status',
                ExpressionAttributeNames: {
                    '#status': 'status'
                },
                ExpressionAttributeValues: {
                    ':status': 'active'
                }
            };

            const result = await dynamodb.query(params).promise();
            
            result.Items.forEach(item => {
                this.monitoredAddresses.add(item.address);
            });

        } catch (error) {
            console.error('Error loading monitored addresses:', error);
        }
    }

    // Get last processed ledger from DynamoDB
    async getLastProcessedLedger() {
        try {
            const params = {
                TableName: MONITORING_TABLE,
                Key: {
                    address: 'SYSTEM',
                    type: 'LAST_LEDGER'
                }
            };

            const result = await dynamodb.get(params).promise();
            
            if (result.Item) {
                this.lastProcessedLedger = result.Item.ledgerIndex || 0;
            }

        } catch (error) {
            console.error('Error getting last processed ledger:', error);
        }
    }

    // Update last processed ledger
    async updateLastProcessedLedger(ledgerIndex) {
        try {
            const params = {
                TableName: MONITORING_TABLE,
                Key: {
                    address: 'SYSTEM',
                    type: 'LAST_LEDGER'
                },
                UpdateExpression: 'SET ledgerIndex = :ledgerIndex, updatedAt = :updatedAt',
                ExpressionAttributeValues: {
                    ':ledgerIndex': ledgerIndex,
                    ':updatedAt': new Date().toISOString()
                }
            };

            await dynamodb.update(params).promise();
            this.lastProcessedLedger = ledgerIndex;

        } catch (error) {
            console.error('Error updating last processed ledger:', error);
        }
    }

    // Monitor XRPL transactions
    async monitorXRPL() {
        console.log('Starting XRPL monitoring...');

        try {
            // Get recent ledgers
            const currentLedger = await this.getCurrentXRPLLedger();
            const startLedger = Math.max(this.lastProcessedLedger + 1, currentLedger - 10);

            console.log(`Processing XRPL ledgers ${startLedger} to ${currentLedger}`);

            for (let ledgerIndex = startLedger; ledgerIndex <= currentLedger; ledgerIndex++) {
                await this.processXRPLLedger(ledgerIndex);
            }

            await this.updateLastProcessedLedger(currentLedger);

        } catch (error) {
            console.error('Error monitoring XRPL:', error);
            await this.sendAlert('XRPL monitoring error', error.message);
        }
    }

    // Get current XRPL ledger
    async getCurrentXRPLLedger() {
        return new Promise((resolve, reject) => {
            const data = JSON.stringify({
                method: 'ledger',
                params: [{
                    ledger_index: 'current',
                    accounts: false,
                    full: false,
                    transactions: false,
                    expand: false,
                    owner_funds: false
                }]
            });

            const options = {
                hostname: 'xrplcluster.com',
                port: 443,
                path: '/',
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Content-Length': data.length
                }
            };

            const req = https.request(options, (res) => {
                let body = '';
                res.on('data', (chunk) => body += chunk);
                res.on('end', () => {
                    try {
                        const response = JSON.parse(body);
                        if (response.result && response.result.ledger_index) {
                            resolve(response.result.ledger_index);
                        } else {
                            reject(new Error('Invalid XRPL response'));
                        }
                    } catch (error) {
                        reject(error);
                    }
                });
            });

            req.on('error', reject);
            req.write(data);
            req.end();
        });
    }

    // Process XRPL ledger transactions
    async processXRPLLedger(ledgerIndex) {
        try {
            const ledgerData = await this.getXRPLLedger(ledgerIndex);
            
            if (!ledgerData.transactions) {
                return;
            }

            for (const tx of ledgerData.transactions) {
                await this.processXRPLTransaction(tx, ledgerIndex);
            }

        } catch (error) {
            console.error(`Error processing XRPL ledger ${ledgerIndex}:`, error);
        }
    }

    // Get XRPL ledger data
    async getXRPLLedger(ledgerIndex) {
        return new Promise((resolve, reject) => {
            const data = JSON.stringify({
                method: 'ledger',
                params: [{
                    ledger_index: ledgerIndex,
                    accounts: false,
                    full: false,
                    transactions: true,
                    expand: true,
                    owner_funds: false
                }]
            });

            const options = {
                hostname: 'xrplcluster.com',
                port: 443,
                path: '/',
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Content-Length': data.length
                }
            };

            const req = https.request(options, (res) => {
                let body = '';
                res.on('data', (chunk) => body += chunk);
                res.on('end', () => {
                    try {
                        const response = JSON.parse(body);
                        if (response.result && response.result.ledger) {
                            resolve(response.result.ledger);
                        } else {
                            reject(new Error('Invalid XRPL ledger response'));
                        }
                    } catch (error) {
                        reject(error);
                    }
                });
            });

            req.on('error', reject);
            req.write(data);
            req.end();
        });
    }

    // Process individual XRPL transaction
    async processXRPLTransaction(tx, ledgerIndex) {
        try {
            const account = tx.Account;
            const destination = tx.Destination;

            // Check if we're monitoring this address
            if (this.monitoredAddresses.has(account) || this.monitoredAddresses.has(destination)) {
                console.log(`Found monitored transaction: ${tx.hash}`);

                const event = {
                    network: 'XRPL',
                    transactionHash: tx.hash,
                    ledgerIndex: ledgerIndex,
                    transactionType: tx.TransactionType,
                    account: account,
                    destination: destination,
                    amount: tx.Amount,
                    fee: tx.Fee,
                    timestamp: new Date().toISOString(),
                    rawTransaction: tx
                };

                await this.saveTransactionEvent(event);
                await this.notifyTransactionEvent(event);
            }

        } catch (error) {
            console.error('Error processing XRPL transaction:', error);
        }
    }

    // Monitor Flare network
    async monitorFlare() {
        console.log('Starting Flare monitoring...');

        try {
            // Get current block number
            const currentBlock = await this.getCurrentFlareBlock();
            const startBlock = Math.max(this.lastProcessedBlock + 1, currentBlock - 10);

            console.log(`Processing Flare blocks ${startBlock} to ${currentBlock}`);

            for (let blockNumber = startBlock; blockNumber <= currentBlock; blockNumber++) {
                await this.processFlareBlock(blockNumber);
            }

        } catch (error) {
            console.error('Error monitoring Flare:', error);
            await this.sendAlert('Flare monitoring error', error.message);
        }
    }

    // Get current Flare block
    async getCurrentFlareBlock() {
        return new Promise((resolve, reject) => {
            const data = JSON.stringify({
                jsonrpc: '2.0',
                method: 'eth_blockNumber',
                params: [],
                id: 1
            });

            const url = new URL(FLARE_RPC_URL);
            const options = {
                hostname: url.hostname,
                port: url.port || 443,
                path: url.pathname,
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Content-Length': data.length
                }
            };

            const req = https.request(options, (res) => {
                let body = '';
                res.on('data', (chunk) => body += chunk);
                res.on('end', () => {
                    try {
                        const response = JSON.parse(body);
                        if (response.result) {
                            resolve(parseInt(response.result, 16));
                        } else {
                            reject(new Error('Invalid Flare response'));
                        }
                    } catch (error) {
                        reject(error);
                    }
                });
            });

            req.on('error', reject);
            req.write(data);
            req.end();
        });
    }

    // Save transaction event to DynamoDB
    async saveTransactionEvent(event) {
        try {
            const params = {
                TableName: MONITORING_TABLE,
                Item: {
                    address: event.account,
                    type: 'TRANSACTION',
                    transactionHash: event.transactionHash,
                    network: event.network,
                    timestamp: event.timestamp,
                    ...event
                }
            };

            await dynamodb.put(params).promise();
            console.log(`Saved transaction event: ${event.transactionHash}`);

        } catch (error) {
            console.error('Error saving transaction event:', error);
        }
    }

    // Notify about transaction event
    async notifyTransactionEvent(event) {
        try {
            const message = {
                type: 'BLOCKCHAIN_TRANSACTION',
                network: event.network,
                transactionHash: event.transactionHash,
                account: event.account,
                destination: event.destination,
                amount: event.amount,
                timestamp: event.timestamp
            };

            const params = {
                TopicArn: SNS_TOPIC_ARN,
                Message: JSON.stringify(message),
                Subject: `Blockchain Transaction - ${event.network}`,
                MessageAttributes: {
                    network: {
                        DataType: 'String',
                        StringValue: event.network
                    },
                    transactionType: {
                        DataType: 'String',
                        StringValue: event.transactionType
                    }
                }
            };

            await sns.publish(params).promise();
            console.log(`Notification sent for transaction: ${event.transactionHash}`);

        } catch (error) {
            console.error('Error sending notification:', error);
        }
    }

    // Send alert
    async sendAlert(subject, message) {
        try {
            const params = {
                TopicArn: SNS_TOPIC_ARN,
                Message: message,
                Subject: `NexVestXR Alert: ${subject}`,
                MessageAttributes: {
                    alertType: {
                        DataType: 'String',
                        StringValue: 'ERROR'
                    }
                }
            };

            await sns.publish(params).promise();

        } catch (error) {
            console.error('Error sending alert:', error);
        }
    }

    // Run monitoring cycle
    async run() {
        await this.initialize();
        
        // Monitor both networks
        await Promise.all([
            this.monitorXRPL(),
            this.monitorFlare()
        ]);

        console.log('Monitoring cycle completed');
    }
}

// Lambda handler
exports.handler = async (event, context) => {
    console.log('Starting blockchain monitoring Lambda');
    console.log('Event:', JSON.stringify(event, null, 2));

    const monitor = new BlockchainMonitor();

    try {
        await monitor.run();
        
        return {
            statusCode: 200,
            body: JSON.stringify({
                message: 'Blockchain monitoring completed successfully',
                timestamp: new Date().toISOString()
            })
        };

    } catch (error) {
        console.error('Blockchain monitoring error:', error);

        await monitor.sendAlert('Lambda execution error', error.message);

        return {
            statusCode: 500,
            body: JSON.stringify({
                error: 'Blockchain monitoring failed',
                message: error.message,
                timestamp: new Date().toISOString()
            })
        };
    }
};