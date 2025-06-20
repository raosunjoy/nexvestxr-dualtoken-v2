// ============================================================================
// SUPERADMIN API INTEGRATION TESTS - HIGHEST LEVEL ACCESS
// ============================================================================

const request = require('supertest');
const mongoose = require('mongoose');
const app = require('../../src/server');

describe('NexVestXR SuperAdmin API - Comprehensive Integration Tests', () => {
    let superAdminToken;
    let adminToken;
    let userToken;
    let testSuperAdminUser;
    let testAdminUser;
    let testRegularUser;
    
    // Test data
    const superAdminData = {
        username: 'testsuperadmin',
        email: 'superadmin@nexvestxr.com',
        password: 'SuperAdmin@123456',
        firstName: 'Test',
        lastName: 'SuperAdmin',
        phone: '+971501111111',
        country: 'AE',
        nationality: 'AE',
        investorType: 'institutional',
        kycLevel: 'premium',
        role: 'superadmin' // Will be set after creation
    };

    const adminData = {
        username: 'testadmin2',
        email: 'admin2@nexvestxr.com',
        password: 'Admin2@123456',
        firstName: 'Test',
        lastName: 'Admin2',
        phone: '+971502222222',
        country: 'AE',
        nationality: 'AE',
        investorType: 'institutional',
        kycLevel: 'premium',
        role: 'admin'
    };

    const userData = {
        username: 'testuser2',
        email: 'user2@nexvestxr.com',
        password: 'User2@123456',
        firstName: 'Test',
        lastName: 'User2',
        phone: '+971503333333',
        country: 'AE',
        nationality: 'AE',
        investorType: 'individual',
        kycLevel: 'basic'
    };

    beforeAll(async () => {
        // Wait for server to be ready
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Clean up test users
        try {
            if (mongoose.connection.readyState === 1) {
                const User = mongoose.model('User');
                await User.deleteMany({ 
                    $or: [
                        { email: superAdminData.email },
                        { email: adminData.email },
                        { email: userData.email }
                    ]
                });
            }
        } catch (error) {
            console.log('Cleanup error:', error.message);
        }
    });

    afterAll(async () => {
        // Cleanup after tests
        try {
            if (mongoose.connection.readyState === 1) {
                const User = mongoose.model('User');
                await User.deleteMany({ 
                    $or: [
                        { email: superAdminData.email },
                        { email: adminData.email },
                        { email: userData.email }
                    ]
                });
            }
        } catch (error) {
            console.log('Cleanup error:', error.message);
        }
    });

    describe('SuperAdmin Setup', () => {
        it('should create superadmin user', async () => {
            // Create user first
            const response = await request(app)
                .post('/api/auth/register')
                .send(superAdminData)
                .expect(201);

            expect(response.body).toHaveProperty('success', true);
            
            // Update to superadmin role (in production, this would be done securely)
            const User = mongoose.model('User');
            await User.findByIdAndUpdate(response.body.data.userId, { role: 'superadmin' });
            
            testSuperAdminUser = response.body.data;
        });

        it('should login as superadmin', async () => {
            const response = await request(app)
                .post('/api/auth/login')
                .send({
                    email: superAdminData.email,
                    password: superAdminData.password
                })
                .expect(200);

            expect(response.body).toHaveProperty('success', true);
            expect(response.body.data).toHaveProperty('token');
            superAdminToken = response.body.data.token;
        });

        it('should create admin and regular users', async () => {
            // Create admin user
            let response = await request(app)
                .post('/api/auth/register')
                .send(adminData)
                .expect(201);
            
            testAdminUser = response.body.data;
            
            // Update to admin role
            const User = mongoose.model('User');
            await User.findByIdAndUpdate(testAdminUser.userId, { role: 'admin' });
            
            // Login as admin
            response = await request(app)
                .post('/api/auth/login')
                .send({
                    email: adminData.email,
                    password: adminData.password
                })
                .expect(200);
            
            adminToken = response.body.data.token;

            // Create regular user
            response = await request(app)
                .post('/api/auth/register')
                .send(userData)
                .expect(201);
            
            testRegularUser = response.body.data;

            // Login as regular user
            response = await request(app)
                .post('/api/auth/login')
                .send({
                    email: userData.email,
                    password: userData.password
                })
                .expect(200);
            
            userToken = response.body.data.token;
        });
    });

    describe('SuperAdmin System Configuration', () => {
        describe('Platform Configuration Management', () => {
            it('should get platform configuration', async () => {
                const response = await request(app)
                    .get('/api/superadmin/config')
                    .set('Authorization', `Bearer ${superAdminToken}`)
                    .expect(200);

                expect(response.body).toHaveProperty('success', true);
                expect(response.body.data).toHaveProperty('platform');
                expect(response.body.data).toHaveProperty('blockchain');
                expect(response.body.data).toHaveProperty('fees');
                expect(response.body.data).toHaveProperty('limits');
            });

            it('should update platform configuration', async () => {
                const configUpdate = {
                    fees: {
                        platformFee: 1.5,
                        developerTier1Fee: 1.0,
                        developerTier2Fee: 2.0
                    },
                    limits: {
                        minInvestment: 25000,
                        maxInvestment: 50000000
                    }
                };

                const response = await request(app)
                    .put('/api/superadmin/config')
                    .set('Authorization', `Bearer ${superAdminToken}`)
                    .send(configUpdate)
                    .expect(200);

                expect(response.body).toHaveProperty('success', true);
                expect(response.body.data.fees.platformFee).toBe(1.5);
            });

            it('should reject config updates from admin', async () => {
                const response = await request(app)
                    .put('/api/superadmin/config')
                    .set('Authorization', `Bearer ${adminToken}`)
                    .send({ fees: { platformFee: 2.0 } })
                    .expect(403);

                expect(response.body).toHaveProperty('success', false);
            });
        });

        describe('Blockchain Network Management', () => {
            it('should get blockchain network status', async () => {
                const response = await request(app)
                    .get('/api/superadmin/blockchain/status')
                    .set('Authorization', `Bearer ${superAdminToken}`)
                    .expect(200);

                expect(response.body).toHaveProperty('success', true);
                expect(response.body.data).toHaveProperty('xrpl');
                expect(response.body.data).toHaveProperty('flare');
                expect(response.body.data.xrpl).toHaveProperty('connected');
                expect(response.body.data.flare).toHaveProperty('connected');
            });

            it('should update blockchain configuration', async () => {
                const blockchainConfig = {
                    xrpl: {
                        network: 'testnet',
                        maxRetries: 5
                    },
                    flare: {
                        rpcUrl: 'https://coston-api.flare.network/ext/C/rpc',
                        chainId: 16
                    }
                };

                const response = await request(app)
                    .put('/api/superadmin/blockchain/config')
                    .set('Authorization', `Bearer ${superAdminToken}`)
                    .send(blockchainConfig)
                    .expect(200);

                expect(response.body).toHaveProperty('success', true);
            });
        });
    });

    describe('SuperAdmin User Management', () => {
        describe('Admin Role Management', () => {
            it('should promote user to admin', async () => {
                const response = await request(app)
                    .put(`/api/superadmin/users/${testRegularUser.userId}/role`)
                    .set('Authorization', `Bearer ${superAdminToken}`)
                    .send({ role: 'admin' })
                    .expect(200);

                expect(response.body).toHaveProperty('success', true);
                expect(response.body.data).toHaveProperty('role', 'admin');
            });

            it('should demote admin to user', async () => {
                const response = await request(app)
                    .put(`/api/superadmin/users/${testAdminUser.userId}/role`)
                    .set('Authorization', `Bearer ${superAdminToken}`)
                    .send({ role: 'user' })
                    .expect(200);

                expect(response.body).toHaveProperty('success', true);
                expect(response.body.data).toHaveProperty('role', 'user');
            });

            it('should reject role changes from regular admin', async () => {
                const response = await request(app)
                    .put(`/api/superadmin/users/${testRegularUser.userId}/role`)
                    .set('Authorization', `Bearer ${adminToken}`)
                    .send({ role: 'admin' })
                    .expect(403);

                expect(response.body).toHaveProperty('success', false);
            });
        });

        describe('User Account Management', () => {
            it('should suspend user account', async () => {
                const response = await request(app)
                    .put(`/api/superadmin/users/${testRegularUser.userId}/suspend`)
                    .set('Authorization', `Bearer ${superAdminToken}`)
                    .send({ 
                        reason: 'Suspicious activity detected',
                        duration: 7 // days
                    })
                    .expect(200);

                expect(response.body).toHaveProperty('success', true);
                expect(response.body.data).toHaveProperty('suspended', true);
            });

            it('should reactivate suspended account', async () => {
                const response = await request(app)
                    .put(`/api/superadmin/users/${testRegularUser.userId}/reactivate`)
                    .set('Authorization', `Bearer ${superAdminToken}`)
                    .expect(200);

                expect(response.body).toHaveProperty('success', true);
                expect(response.body.data).toHaveProperty('suspended', false);
            });
        });
    });

    describe('SuperAdmin Emergency Procedures', () => {
        describe('Platform Emergency Controls', () => {
            it('should enable maintenance mode', async () => {
                const response = await request(app)
                    .post('/api/superadmin/emergency/maintenance')
                    .set('Authorization', `Bearer ${superAdminToken}`)
                    .send({
                        enabled: true,
                        message: 'Scheduled maintenance in progress',
                        estimatedDuration: 60 // minutes
                    })
                    .expect(200);

                expect(response.body).toHaveProperty('success', true);
                expect(response.body.data).toHaveProperty('maintenanceMode', true);
            });

            it('should disable maintenance mode', async () => {
                const response = await request(app)
                    .post('/api/superadmin/emergency/maintenance')
                    .set('Authorization', `Bearer ${superAdminToken}`)
                    .send({ enabled: false })
                    .expect(200);

                expect(response.body).toHaveProperty('success', true);
                expect(response.body.data).toHaveProperty('maintenanceMode', false);
            });

            it('should freeze all trading', async () => {
                const response = await request(app)
                    .post('/api/superadmin/emergency/freeze-trading')
                    .set('Authorization', `Bearer ${superAdminToken}`)
                    .send({
                        reason: 'Market volatility',
                        affectedPairs: ['XERA/XRP', 'PROPX/FLR']
                    })
                    .expect(200);

                expect(response.body).toHaveProperty('success', true);
                expect(response.body.data).toHaveProperty('tradingFrozen', true);
            });

            it('should unfreeze trading', async () => {
                const response = await request(app)
                    .post('/api/superadmin/emergency/unfreeze-trading')
                    .set('Authorization', `Bearer ${superAdminToken}`)
                    .expect(200);

                expect(response.body).toHaveProperty('success', true);
                expect(response.body.data).toHaveProperty('tradingFrozen', false);
            });
        });
    });

    describe('SuperAdmin Financial Management', () => {
        describe('Fee Structure Management', () => {
            it('should get current fee structure', async () => {
                const response = await request(app)
                    .get('/api/superadmin/fees')
                    .set('Authorization', `Bearer ${superAdminToken}`)
                    .expect(200);

                expect(response.body).toHaveProperty('success', true);
                expect(response.body.data).toHaveProperty('platform');
                expect(response.body.data).toHaveProperty('developer');
                expect(response.body.data).toHaveProperty('transaction');
            });

            it('should update fee structure', async () => {
                const newFees = {
                    platform: {
                        baseFee: 1.5,
                        premiumFee: 1.0
                    },
                    developer: {
                        tier1: 1.0,
                        tier2: 1.5,
                        tier3: 2.0
                    },
                    transaction: {
                        xrpl: 0.1,
                        flare: 0.2
                    }
                };

                const response = await request(app)
                    .put('/api/superadmin/fees')
                    .set('Authorization', `Bearer ${superAdminToken}`)
                    .send(newFees)
                    .expect(200);

                expect(response.body).toHaveProperty('success', true);
                expect(response.body.data.platform.baseFee).toBe(1.5);
            });
        });

        describe('Treasury Management', () => {
            it('should get treasury balance', async () => {
                const response = await request(app)
                    .get('/api/superadmin/treasury/balance')
                    .set('Authorization', `Bearer ${superAdminToken}`)
                    .expect(200);

                expect(response.body).toHaveProperty('success', true);
                expect(response.body.data).toHaveProperty('totalBalance');
                expect(response.body.data).toHaveProperty('byToken');
                expect(response.body.data).toHaveProperty('byCurrency');
            });

            it('should initiate treasury withdrawal', async () => {
                const withdrawal = {
                    amount: 10000,
                    currency: 'AED',
                    destination: 'operating_expenses',
                    approvalCode: '2FA_CODE_HERE'
                };

                const response = await request(app)
                    .post('/api/superadmin/treasury/withdraw')
                    .set('Authorization', `Bearer ${superAdminToken}`)
                    .send(withdrawal)
                    .expect(200);

                expect(response.body).toHaveProperty('success', true);
                expect(response.body.data).toHaveProperty('withdrawalId');
                expect(response.body.data).toHaveProperty('status', 'pending_2fa');
            });
        });
    });

    describe('SuperAdmin Compliance & Reporting', () => {
        describe('Compliance Dashboard', () => {
            it('should get compliance overview', async () => {
                const response = await request(app)
                    .get('/api/superadmin/compliance/overview')
                    .set('Authorization', `Bearer ${superAdminToken}`)
                    .expect(200);

                expect(response.body).toHaveProperty('success', true);
                expect(response.body.data).toHaveProperty('kycStats');
                expect(response.body.data).toHaveProperty('amlFlags');
                expect(response.body.data).toHaveProperty('regulatoryStatus');
            });

            it('should generate compliance report', async () => {
                const response = await request(app)
                    .post('/api/superadmin/compliance/report')
                    .set('Authorization', `Bearer ${superAdminToken}`)
                    .send({
                        type: 'monthly',
                        month: new Date().getMonth() + 1,
                        year: new Date().getFullYear()
                    })
                    .expect(200);

                expect(response.body).toHaveProperty('success', true);
                expect(response.body.data).toHaveProperty('reportId');
                expect(response.body.data).toHaveProperty('downloadUrl');
            });
        });

        describe('Audit Trail Access', () => {
            it('should get complete audit trail', async () => {
                const response = await request(app)
                    .get('/api/superadmin/audit/full')
                    .set('Authorization', `Bearer ${superAdminToken}`)
                    .query({
                        startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
                        endDate: new Date().toISOString(),
                        includeSystemEvents: true
                    })
                    .expect(200);

                expect(response.body).toHaveProperty('success', true);
                expect(response.body.data).toHaveProperty('events');
                expect(response.body.data).toHaveProperty('summary');
            });

            it('should export audit logs', async () => {
                const response = await request(app)
                    .post('/api/superadmin/audit/export')
                    .set('Authorization', `Bearer ${superAdminToken}`)
                    .send({
                        format: 'csv',
                        dateRange: 'last_30_days',
                        includeUserData: true
                    })
                    .expect(200);

                expect(response.body).toHaveProperty('success', true);
                expect(response.body.data).toHaveProperty('exportId');
                expect(response.body.data).toHaveProperty('downloadUrl');
            });
        });
    });

    describe('SuperAdmin Developer Management', () => {
        describe('Developer Tier Management', () => {
            it('should get all developers', async () => {
                const response = await request(app)
                    .get('/api/superadmin/developers')
                    .set('Authorization', `Bearer ${superAdminToken}`)
                    .expect(200);

                expect(response.body).toHaveProperty('success', true);
                expect(response.body.data).toHaveProperty('developers');
                expect(Array.isArray(response.body.data.developers)).toBe(true);
            });

            it('should update developer tier', async () => {
                // Assuming we have a developer user
                const response = await request(app)
                    .put(`/api/superadmin/developers/${testAdminUser.userId}/tier`)
                    .set('Authorization', `Bearer ${superAdminToken}`)
                    .send({
                        tier: 'TIER1',
                        benefits: {
                            reducedFees: true,
                            prioritySupport: true,
                            marketingSupport: true
                        }
                    })
                    .expect(200);

                expect(response.body).toHaveProperty('success', true);
                expect(response.body.data).toHaveProperty('tier', 'TIER1');
            });
        });
    });

    describe('SuperAdmin Access Control', () => {
        it('should reject superadmin endpoints for regular admin', async () => {
            const endpoints = [
                { method: 'get', url: '/api/superadmin/config' },
                { method: 'put', url: '/api/superadmin/config' },
                { method: 'post', url: '/api/superadmin/emergency/maintenance' },
                { method: 'put', url: `/api/superadmin/users/${testRegularUser.userId}/role` }
            ];

            for (const endpoint of endpoints) {
                const response = await request(app)
                    [endpoint.method](endpoint.url)
                    .set('Authorization', `Bearer ${adminToken}`)
                    .send({ test: 'data' })
                    .expect(403);

                expect(response.body).toHaveProperty('success', false);
            }
        });

        it('should reject superadmin endpoints for regular user', async () => {
            const response = await request(app)
                .get('/api/superadmin/config')
                .set('Authorization', `Bearer ${userToken}`)
                .expect(403);

            expect(response.body).toHaveProperty('success', false);
        });
    });

    describe('SuperAdmin System Monitoring', () => {
        describe('Advanced System Metrics', () => {
            it('should get detailed system metrics', async () => {
                const response = await request(app)
                    .get('/api/superadmin/metrics/detailed')
                    .set('Authorization', `Bearer ${superAdminToken}`)
                    .expect(200);

                expect(response.body).toHaveProperty('success', true);
                expect(response.body.data).toHaveProperty('server');
                expect(response.body.data).toHaveProperty('database');
                expect(response.body.data).toHaveProperty('blockchain');
                expect(response.body.data).toHaveProperty('cache');
                expect(response.body.data).toHaveProperty('performance');
            });

            it('should get error logs', async () => {
                const response = await request(app)
                    .get('/api/superadmin/logs/errors')
                    .set('Authorization', `Bearer ${superAdminToken}`)
                    .query({
                        severity: 'error',
                        limit: 100
                    })
                    .expect(200);

                expect(response.body).toHaveProperty('success', true);
                expect(response.body.data).toHaveProperty('errors');
                expect(Array.isArray(response.body.data.errors)).toBe(true);
            });
        });
    });
});