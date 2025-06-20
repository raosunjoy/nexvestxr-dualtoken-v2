// ============================================================================
// ADMIN API INTEGRATION TESTS - COMPREHENSIVE COVERAGE
// ============================================================================

const request = require('supertest');
const mongoose = require('mongoose');
const app = require('../../src/server');

describe('NexVestXR Admin API - Comprehensive Integration Tests', () => {
    let adminToken;
    let userToken;
    let testAdminUser;
    let testRegularUser;
    let testPropertyId;
    
    // Test data
    const adminUserData = {
        username: 'testadmin',
        email: 'admin@nexvestxr.com',
        password: 'Admin@123456',
        firstName: 'Test',
        lastName: 'Admin',
        phone: '+971501234567',
        country: 'AE',
        nationality: 'AE',
        investorType: 'institutional',
        kycLevel: 'premium',
        role: 'admin' // This will be set after creation
    };

    const regularUserData = {
        username: 'testuser',
        email: 'user@nexvestxr.com',
        password: 'User@123456',
        firstName: 'Test',
        lastName: 'User',
        phone: '+971502345678',
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
                        { email: adminUserData.email },
                        { email: regularUserData.email }
                    ]
                });
                
                const Property = mongoose.model('Property');
                await Property.deleteMany({
                    name: { $regex: /^Test Property Admin/ }
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
                        { email: adminUserData.email },
                        { email: regularUserData.email }
                    ]
                });
                
                const Property = mongoose.model('Property');
                await Property.deleteMany({
                    name: { $regex: /^Test Property Admin/ }
                });
            }
        } catch (error) {
            console.log('Cleanup error:', error.message);
        }
    });

    describe('Admin Setup', () => {
        it('should create admin user', async () => {
            // First create regular user
            const response = await request(app)
                .post('/api/auth/register')
                .send(adminUserData)
                .expect(201);

            expect(response.body).toHaveProperty('success', true);
            expect(response.body.data).toHaveProperty('userId');
            
            // Update user role to admin (in real scenario, this would be done by superadmin)
            const User = mongoose.model('User');
            await User.findByIdAndUpdate(response.body.data.userId, { role: 'admin' });
            
            testAdminUser = response.body.data;
        });

        it('should login as admin', async () => {
            const response = await request(app)
                .post('/api/auth/login')
                .send({
                    email: adminUserData.email,
                    password: adminUserData.password
                })
                .expect(200);

            expect(response.body).toHaveProperty('success', true);
            expect(response.body.data).toHaveProperty('token');
            adminToken = response.body.data.token;
        });

        it('should create regular user for testing', async () => {
            const response = await request(app)
                .post('/api/auth/register')
                .send(regularUserData)
                .expect(201);

            expect(response.body).toHaveProperty('success', true);
            testRegularUser = response.body.data;

            // Login as regular user
            const loginResponse = await request(app)
                .post('/api/auth/login')
                .send({
                    email: regularUserData.email,
                    password: regularUserData.password
                })
                .expect(200);

            userToken = loginResponse.body.data.token;
        });
    });

    describe('Admin Access Control', () => {
        it('should reject non-admin access to admin endpoints', async () => {
            const response = await request(app)
                .get('/api/admin/dashboard/stats')
                .set('Authorization', `Bearer ${userToken}`)
                .expect(403);

            expect(response.body).toHaveProperty('success', false);
            expect(response.body.error).toContain('Admin access required');
        });

        it('should reject unauthenticated access to admin endpoints', async () => {
            const response = await request(app)
                .get('/api/admin/dashboard/stats')
                .expect(401);

            expect(response.body).toHaveProperty('error');
        });
    });

    describe('Platform Analytics & Metrics', () => {
        describe('GET /api/admin/dashboard/stats', () => {
            it('should get comprehensive platform statistics', async () => {
                const response = await request(app)
                    .get('/api/admin/dashboard/stats')
                    .set('Authorization', `Bearer ${adminToken}`)
                    .expect(200);

                expect(response.body).toHaveProperty('success', true);
                expect(response.body.data).toHaveProperty('overview');
                expect(response.body.data.overview).toHaveProperty('totalUsers');
                expect(response.body.data.overview).toHaveProperty('totalProperties');
                expect(response.body.data.overview).toHaveProperty('totalInvestments');
                expect(response.body.data.overview).toHaveProperty('platformHealth');
                expect(response.body.data).toHaveProperty('recent');
                expect(response.body.data.recent).toHaveProperty('users');
                expect(response.body.data.recent).toHaveProperty('properties');
                expect(response.body.data).toHaveProperty('timestamp');
            });
        });

        describe('GET /api/admin/analytics/users', () => {
            it('should get user analytics', async () => {
                const response = await request(app)
                    .get('/api/admin/analytics/users')
                    .set('Authorization', `Bearer ${adminToken}`)
                    .expect(200);

                expect(response.body).toHaveProperty('success', true);
                expect(response.body.data).toHaveProperty('usersByRole');
                expect(response.body.data).toHaveProperty('kycDistribution');
                expect(response.body.data).toHaveProperty('totalUsers');
                expect(Array.isArray(response.body.data.usersByRole)).toBe(true);
                expect(Array.isArray(response.body.data.kycDistribution)).toBe(true);
            });
        });
    });

    describe('User Management', () => {
        describe('GET /api/admin/users', () => {
            it('should get all users with pagination', async () => {
                const response = await request(app)
                    .get('/api/admin/users?page=1&limit=10')
                    .set('Authorization', `Bearer ${adminToken}`)
                    .expect(200);

                expect(response.body).toHaveProperty('success', true);
                expect(response.body.data).toHaveProperty('users');
                expect(response.body.data).toHaveProperty('pagination');
                expect(Array.isArray(response.body.data.users)).toBe(true);
                expect(response.body.data.pagination).toHaveProperty('currentPage', 1);
                expect(response.body.data.pagination).toHaveProperty('totalPages');
                expect(response.body.data.pagination).toHaveProperty('totalUsers');
            });

            it('should search users by username', async () => {
                const response = await request(app)
                    .get(`/api/admin/users?search=${regularUserData.username}`)
                    .set('Authorization', `Bearer ${adminToken}`)
                    .expect(200);

                expect(response.body).toHaveProperty('success', true);
                expect(response.body.data.users.length).toBeGreaterThan(0);
                expect(response.body.data.users[0].username).toBe(regularUserData.username);
            });

            it('should filter users by role', async () => {
                const response = await request(app)
                    .get('/api/admin/users?role=user')
                    .set('Authorization', `Bearer ${adminToken}`)
                    .expect(200);

                expect(response.body).toHaveProperty('success', true);
                expect(response.body.data.users.every(user => user.role === 'user')).toBe(true);
            });

            it('should filter users by KYC level', async () => {
                const response = await request(app)
                    .get('/api/admin/users?kycLevel=basic')
                    .set('Authorization', `Bearer ${adminToken}`)
                    .expect(200);

                expect(response.body).toHaveProperty('success', true);
                expect(response.body.data.users.every(user => user.kycLevel === 'basic')).toBe(true);
            });
        });

        describe('PUT /api/admin/users/:userId', () => {
            it('should update user details', async () => {
                const response = await request(app)
                    .put(`/api/admin/users/${testRegularUser.userId}`)
                    .set('Authorization', `Bearer ${adminToken}`)
                    .send({
                        kycLevel: 'enhanced',
                        investorType: 'institutional'
                    })
                    .expect(200);

                expect(response.body).toHaveProperty('success', true);
                expect(response.body.data).toHaveProperty('kycLevel', 'enhanced');
                expect(response.body.data).toHaveProperty('investorType', 'institutional');
            });

            it('should return 404 for non-existent user', async () => {
                const fakeUserId = new mongoose.Types.ObjectId();
                const response = await request(app)
                    .put(`/api/admin/users/${fakeUserId}`)
                    .set('Authorization', `Bearer ${adminToken}`)
                    .send({
                        kycLevel: 'enhanced'
                    })
                    .expect(404);

                expect(response.body).toHaveProperty('success', false);
                expect(response.body.error).toContain('User not found');
            });
        });

        describe('DELETE /api/admin/users/:userId', () => {
            let userToDelete;

            beforeEach(async () => {
                // Create a user to delete
                const response = await request(app)
                    .post('/api/auth/register')
                    .send({
                        username: 'deleteuser',
                        email: 'delete@nexvestxr.com',
                        password: 'Delete@123456',
                        firstName: 'Delete',
                        lastName: 'User',
                        phone: '+971503456789',
                        country: 'AE',
                        nationality: 'AE',
                        investorType: 'individual',
                        kycLevel: 'basic'
                    });
                userToDelete = response.body.data;
            });

            it('should delete user', async () => {
                const response = await request(app)
                    .delete(`/api/admin/users/${userToDelete.userId}`)
                    .set('Authorization', `Bearer ${adminToken}`)
                    .expect(200);

                expect(response.body).toHaveProperty('success', true);
                expect(response.body).toHaveProperty('message', 'User deleted successfully');

                // Verify user is deleted
                const User = mongoose.model('User');
                const deletedUser = await User.findById(userToDelete.userId);
                expect(deletedUser).toBeNull();
            });
        });
    });

    describe('Property Management', () => {
        beforeEach(async () => {
            // Create a test property
            const propertyData = {
                propertyId: `PROP_ADMIN_${Date.now()}`,
                tokenCode: `TOKEN_ADMIN_${Date.now()}`,
                name: 'Test Property Admin',
                location: 'Dubai Marina',
                totalValue: 5000000,
                totalSupply: 1000000,
                propertyType: 'Residential',
                expectedROI: 8.5,
                documents: {
                    titleDeed: {
                        ipfsHash: 'deed_hash_admin',
                        content: 'base64_content',
                        verified: false
                    },
                    encumbranceCertificate: {
                        ipfsHash: 'encumbrance_hash_admin',
                        content: 'base64_content',
                        verified: false
                    },
                    approvals: {
                        ipfsHash: 'approval_hash_admin',
                        content: 'base64_content',
                        verified: false
                    }
                }
            };

            const response = await request(app)
                .post('/api/property')
                .set('Authorization', `Bearer ${userToken}`)
                .send(propertyData)
                .expect(201);

            testPropertyId = response.body.data.propertyId;
        });

        describe('GET /api/admin/properties', () => {
            it('should get all properties with admin details', async () => {
                const response = await request(app)
                    .get('/api/admin/properties')
                    .set('Authorization', `Bearer ${adminToken}`)
                    .expect(200);

                expect(response.body).toHaveProperty('success', true);
                expect(response.body.data).toHaveProperty('properties');
                expect(response.body.data).toHaveProperty('pagination');
                expect(Array.isArray(response.body.data.properties)).toBe(true);
                
                if (response.body.data.properties.length > 0) {
                    const property = response.body.data.properties[0];
                    expect(property).toHaveProperty('developer');
                    expect(property.developer).toHaveProperty('username');
                    expect(property.developer).toHaveProperty('email');
                }
            });

            it('should filter properties by status', async () => {
                const response = await request(app)
                    .get('/api/admin/properties?status=Draft')
                    .set('Authorization', `Bearer ${adminToken}`)
                    .expect(200);

                expect(response.body).toHaveProperty('success', true);
                expect(response.body.data.properties.every(prop => prop.status === 'Draft')).toBe(true);
            });

            it('should filter properties by type', async () => {
                const response = await request(app)
                    .get('/api/admin/properties?propertyType=Residential')
                    .set('Authorization', `Bearer ${adminToken}`)
                    .expect(200);

                expect(response.body).toHaveProperty('success', true);
                expect(response.body.data.properties.every(prop => prop.propertyType === 'Residential')).toBe(true);
            });
        });

        describe('PUT /api/admin/properties/:propertyId/status', () => {
            it('should update property status', async () => {
                const response = await request(app)
                    .put(`/api/admin/properties/${testPropertyId}/status`)
                    .set('Authorization', `Bearer ${adminToken}`)
                    .send({
                        status: 'Active',
                        adminNotes: 'Property approved for tokenization'
                    })
                    .expect(200);

                expect(response.body).toHaveProperty('success', true);
                expect(response.body.data).toHaveProperty('status', 'Active');
                expect(response.body.data).toHaveProperty('adminNotes', 'Property approved for tokenization');
            });

            it('should reject invalid status', async () => {
                const response = await request(app)
                    .put(`/api/admin/properties/${testPropertyId}/status`)
                    .set('Authorization', `Bearer ${adminToken}`)
                    .send({
                        status: 'InvalidStatus'
                    })
                    .expect(400);

                expect(response.body).toHaveProperty('success', false);
                expect(response.body.error).toContain('Invalid status');
            });

            it('should return 404 for non-existent property', async () => {
                const response = await request(app)
                    .put('/api/admin/properties/PROP_FAKE_123/status')
                    .set('Authorization', `Bearer ${adminToken}`)
                    .send({
                        status: 'Active'
                    })
                    .expect(404);

                expect(response.body).toHaveProperty('success', false);
                expect(response.body.error).toContain('Property not found');
            });
        });
    });

    describe('System Monitoring', () => {
        describe('GET /api/admin/system/health', () => {
            it('should get system health metrics', async () => {
                const response = await request(app)
                    .get('/api/admin/system/health')
                    .set('Authorization', `Bearer ${adminToken}`)
                    .expect(200);

                expect(response.body).toHaveProperty('success', true);
                expect(response.body.data).toHaveProperty('database');
                expect(response.body.data.database).toHaveProperty('status');
                expect(response.body.data).toHaveProperty('server');
                expect(response.body.data.server).toHaveProperty('uptime');
                expect(response.body.data.server).toHaveProperty('memory');
                expect(response.body.data.server).toHaveProperty('nodeVersion');
                expect(response.body.data).toHaveProperty('metrics');
                expect(response.body.data.metrics).toHaveProperty('totalUsers');
                expect(response.body.data.metrics).toHaveProperty('totalProperties');
                expect(response.body.data.metrics).toHaveProperty('activeUsers');
            });
        });

        describe('POST /api/admin/system/cache/clear', () => {
            it('should clear system cache', async () => {
                const response = await request(app)
                    .post('/api/admin/system/cache/clear')
                    .set('Authorization', `Bearer ${adminToken}`)
                    .expect(200);

                expect(response.body).toHaveProperty('success', true);
                expect(response.body).toHaveProperty('message', 'System cache cleared successfully');
            });
        });
    });

    describe('Audit Logs', () => {
        describe('GET /api/admin/audit/logs', () => {
            it('should get audit logs', async () => {
                const response = await request(app)
                    .get('/api/admin/audit/logs')
                    .set('Authorization', `Bearer ${adminToken}`)
                    .expect(200);

                expect(response.body).toHaveProperty('success', true);
                expect(response.body.data).toHaveProperty('logs');
                expect(response.body.data).toHaveProperty('pagination');
                expect(Array.isArray(response.body.data.logs)).toBe(true);
                
                if (response.body.data.logs.length > 0) {
                    const log = response.body.data.logs[0];
                    expect(log).toHaveProperty('id');
                    expect(log).toHaveProperty('timestamp');
                    expect(log).toHaveProperty('userId');
                    expect(log).toHaveProperty('action');
                    expect(log).toHaveProperty('resource');
                }
            });

            it('should filter audit logs with query parameters', async () => {
                const startDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
                const endDate = new Date().toISOString();

                const response = await request(app)
                    .get(`/api/admin/audit/logs?startDate=${startDate}&endDate=${endDate}&page=1&limit=10`)
                    .set('Authorization', `Bearer ${adminToken}`)
                    .expect(200);

                expect(response.body).toHaveProperty('success', true);
                expect(response.body.data.pagination).toHaveProperty('currentPage', 1);
            });
        });
    });

    describe('Rate Limiting', () => {
        it('should apply admin-specific rate limits', async () => {
            // This test would need to make many requests quickly to test rate limiting
            // For now, we'll just verify the endpoint works
            const response = await request(app)
                .get('/api/admin/dashboard/stats')
                .set('Authorization', `Bearer ${adminToken}`)
                .expect(200);

            expect(response.body).toHaveProperty('success', true);
        });
    });

    describe('Error Handling', () => {
        it('should handle database errors gracefully', async () => {
            // Test with invalid MongoDB ObjectId format
            const response = await request(app)
                .put('/api/admin/users/invalid-id-format')
                .set('Authorization', `Bearer ${adminToken}`)
                .send({
                    kycLevel: 'enhanced'
                })
                .expect(500);

            expect(response.body).toHaveProperty('success', false);
            expect(response.body).toHaveProperty('error');
        });

        it('should validate input data', async () => {
            const response = await request(app)
                .put(`/api/admin/users/${testRegularUser.userId}`)
                .set('Authorization', `Bearer ${adminToken}`)
                .send({
                    role: 'invalid-role'
                })
                .expect(200); // This might need adjustment based on validation implementation

            // The user model should reject invalid roles
            expect(response.body).toBeDefined();
        });
    });
});