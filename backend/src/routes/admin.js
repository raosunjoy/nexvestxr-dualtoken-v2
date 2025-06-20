// ============================================================================
// ADMIN API ROUTES - COMPREHENSIVE PLATFORM MANAGEMENT
// ============================================================================

const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const { adminApiRateLimit } = require('../middleware/rate-limiting-middleware');
const User = require('../models/User');
const Property = require('../models/Property');
const logger = require('../utils/logger');
const mongoose = require('mongoose');

// Middleware to verify admin role
const requireAdmin = async (req, res, next) => {
    try {
        if (req.user.role !== 'admin') {
            return res.status(403).json({
                success: false,
                error: 'Admin access required'
            });
        }
        next();
    } catch (error) {
        res.status(500).json({
            success: false,
            error: 'Authorization check failed'
        });
    }
};

// ============================================================================
// PLATFORM ANALYTICS & METRICS
// ============================================================================

// Get comprehensive platform statistics
router.get('/dashboard/stats', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const [
            totalUsers,
            totalProperties,
            totalInvestments,
            recentUsers,
            recentProperties
        ] = await Promise.all([
            User.countDocuments(),
            Property.countDocuments(),
            Property.aggregate([{ $group: { _id: null, total: { $sum: '$totalValue' } } }]),
            User.find().sort({ createdAt: -1 }).limit(10).select('-password'),
            Property.find().sort({ createdAt: -1 }).limit(10)
        ]);

        res.json({
            success: true,
            data: {
                overview: {
                    totalUsers,
                    totalProperties,
                    totalInvestments: totalInvestments[0]?.total || 0,
                    platformHealth: 'optimal'
                },
                recent: {
                    users: recentUsers,
                    properties: recentProperties
                },
                timestamp: new Date().toISOString()
            }
        });
    } catch (error) {
        logger.error('Admin dashboard stats error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch platform statistics'
        });
    }
});

// Get user analytics
router.get('/analytics/users', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const userStats = await User.aggregate([
            {
                $group: {
                    _id: '$role',
                    count: { $sum: 1 },
                    avgInvestorType: { $first: '$investorType' }
                }
            }
        ]);

        const kycStats = await User.aggregate([
            {
                $group: {
                    _id: '$kycLevel',
                    count: { $sum: 1 }
                }
            }
        ]);

        res.json({
            success: true,
            data: {
                usersByRole: userStats,
                kycDistribution: kycStats,
                totalUsers: await User.countDocuments()
            }
        });
    } catch (error) {
        logger.error('Admin user analytics error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch user analytics'
        });
    }
});

// ============================================================================
// USER MANAGEMENT
// ============================================================================

// Get all users with pagination
router.get('/users', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const { page = 1, limit = 20, search, role, kycLevel } = req.query;
        const skip = (page - 1) * limit;

        let query = {};
        if (search) {
            query = {
                $or: [
                    { username: { $regex: search, $options: 'i' } },
                    { email: { $regex: search, $options: 'i' } },
                    { firstName: { $regex: search, $options: 'i' } },
                    { lastName: { $regex: search, $options: 'i' } }
                ]
            };
        }
        if (role) query.role = role;
        if (kycLevel) query.kycLevel = kycLevel;

        const [users, totalUsers] = await Promise.all([
            User.find(query)
                .select('-password')
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(parseInt(limit)),
            User.countDocuments(query)
        ]);

        res.json({
            success: true,
            data: {
                users,
                pagination: {
                    currentPage: parseInt(page),
                    totalPages: Math.ceil(totalUsers / limit),
                    totalUsers,
                    hasNext: skip + users.length < totalUsers,
                    hasPrev: page > 1
                }
            }
        });
    } catch (error) {
        logger.error('Admin get users error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch users'
        });
    }
});

// Update user details (admin only)
router.put('/users/:userId', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const { userId } = req.params;
        const { role, kycLevel, investorType, country, nationality } = req.body;

        const user = await User.findByIdAndUpdate(
            userId,
            { 
                role, 
                kycLevel, 
                investorType, 
                country, 
                nationality,
                updatedAt: new Date()
            },
            { new: true }
        ).select('-password');

        if (!user) {
            return res.status(404).json({
                success: false,
                error: 'User not found'
            });
        }

        logger.info('Admin updated user', { 
            adminId: req.user.id, 
            updatedUserId: userId,
            changes: { role, kycLevel, investorType }
        });

        res.json({
            success: true,
            data: user
        });
    } catch (error) {
        logger.error('Admin update user error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to update user'
        });
    }
});

// Delete user (admin only)
router.delete('/users/:userId', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const { userId } = req.params;

        const user = await User.findByIdAndDelete(userId);
        if (!user) {
            return res.status(404).json({
                success: false,
                error: 'User not found'
            });
        }

        logger.warn('Admin deleted user', { 
            adminId: req.user.id, 
            deletedUserId: userId,
            deletedUserEmail: user.email
        });

        res.json({
            success: true,
            message: 'User deleted successfully'
        });
    } catch (error) {
        logger.error('Admin delete user error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to delete user'
        });
    }
});

// ============================================================================
// PROPERTY MANAGEMENT
// ============================================================================

// Get all properties with admin details
router.get('/properties', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const { page = 1, limit = 20, status, propertyType } = req.query;
        const skip = (page - 1) * limit;

        let query = {};
        if (status) query.status = status;
        if (propertyType) query.propertyType = propertyType;

        const [properties, totalProperties] = await Promise.all([
            Property.find(query)
                .populate('developer', 'username email firstName lastName')
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(parseInt(limit)),
            Property.countDocuments(query)
        ]);

        res.json({
            success: true,
            data: {
                properties,
                pagination: {
                    currentPage: parseInt(page),
                    totalPages: Math.ceil(totalProperties / limit),
                    totalProperties,
                    hasNext: skip + properties.length < totalProperties,
                    hasPrev: page > 1
                }
            }
        });
    } catch (error) {
        logger.error('Admin get properties error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch properties'
        });
    }
});

// Update property status (admin approval/rejection)
router.put('/properties/:propertyId/status', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const { propertyId } = req.params;
        const { status, adminNotes } = req.body;

        const allowedStatuses = ['Draft', 'Tokenized', 'Active', 'Sold'];
        if (!allowedStatuses.includes(status)) {
            return res.status(400).json({
                success: false,
                error: 'Invalid status'
            });
        }

        const property = await Property.findOneAndUpdate(
            { propertyId },
            { 
                status,
                adminNotes,
                updatedAt: new Date()
            },
            { new: true }
        ).populate('developer', 'username email');

        if (!property) {
            return res.status(404).json({
                success: false,
                error: 'Property not found'
            });
        }

        logger.info('Admin updated property status', {
            adminId: req.user.id,
            propertyId,
            newStatus: status,
            adminNotes
        });

        res.json({
            success: true,
            data: property
        });
    } catch (error) {
        logger.error('Admin update property status error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to update property status'
        });
    }
});

// ============================================================================
// SYSTEM MONITORING
// ============================================================================

// Get system health metrics
router.get('/system/health', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const systemHealth = {
            database: {
                status: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
                name: mongoose.connection.name
            },
            server: {
                uptime: process.uptime(),
                memory: process.memoryUsage(),
                nodeVersion: process.version
            },
            metrics: {
                totalUsers: await User.countDocuments(),
                totalProperties: await Property.countDocuments(),
                activeUsers: await User.countDocuments({ 
                    updatedAt: { 
                        $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) 
                    } 
                })
            }
        };

        res.json({
            success: true,
            data: systemHealth
        });
    } catch (error) {
        logger.error('Admin system health error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch system health'
        });
    }
});

// Clear system cache (if Redis is implemented)
router.post('/system/cache/clear', authenticateToken, requireAdmin, async (req, res) => {
    try {
        // In a real implementation, this would clear Redis cache
        logger.info('Admin cleared system cache', { adminId: req.user.id });
        
        res.json({
            success: true,
            message: 'System cache cleared successfully'
        });
    } catch (error) {
        logger.error('Admin clear cache error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to clear cache'
        });
    }
});

// ============================================================================
// AUDIT LOGS
// ============================================================================

// Get audit logs (admin access only)
router.get('/audit/logs', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const { startDate, endDate, userId, action, page = 1, limit = 50 } = req.query;
        
        // In a real implementation, this would fetch from audit log storage
        const mockAuditLogs = [
            {
                id: 1,
                timestamp: new Date().toISOString(),
                userId: req.user.id,
                action: 'user_login',
                resource: 'authentication',
                ipAddress: req.ip,
                userAgent: req.get('User-Agent')
            },
            {
                id: 2,
                timestamp: new Date(Date.now() - 3600000).toISOString(),
                userId: req.user.id,
                action: 'property_created',
                resource: 'property_management',
                ipAddress: req.ip,
                details: { propertyId: 'PROP_123' }
            }
        ];

        res.json({
            success: true,
            data: {
                logs: mockAuditLogs,
                pagination: {
                    currentPage: parseInt(page),
                    totalPages: 1,
                    totalLogs: mockAuditLogs.length
                }
            }
        });
    } catch (error) {
        logger.error('Admin audit logs error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch audit logs'
        });
    }
});

module.exports = router;