const express = require('express');
const { authenticateToken } = require('../middleware/auth');
const winston = require('winston');

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.json(),
  transports: [new winston.transports.Console()]
});

const router = express.Router();

// Get user notifications
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { page = 1, limit = 20, type, read } = req.query;

    // Mock notifications data
    let notifications = [
      {
        id: 'notif_001',
        type: 'investment',
        title: 'Investment Completed',
        message: 'Your investment in Marina Heights has been successfully processed.',
        read: false,
        createdAt: '2024-06-20T10:30:00Z',
        data: {
          propertyId: 'PROP_001',
          amount: 250000
        }
      },
      {
        id: 'notif_002',
        type: 'dividend',
        title: 'Dividend Payment',
        message: 'You received AED 1,875 dividend from Business Bay Tower.',
        read: true,
        createdAt: '2024-06-19T14:15:00Z',
        data: {
          propertyId: 'PROP_002',
          amount: 1875
        }
      },
      {
        id: 'notif_003',
        type: 'system',
        title: 'Portfolio Update',
        message: 'Your portfolio value has increased by 5.2% this month.',
        read: false,
        createdAt: '2024-06-18T09:00:00Z'
      },
      {
        id: 'notif_004',
        type: 'trading',
        title: 'Order Executed',
        message: 'Your buy order for 100 XERA tokens has been filled at AED 1,200.',
        read: true,
        createdAt: '2024-06-17T16:45:00Z',
        data: {
          orderId: 'ORD_001',
          symbol: 'XERA/AED',
          amount: 100,
          price: 1200
        }
      },
      {
        id: 'notif_005',
        type: 'kyc',
        title: 'KYC Status Update',
        message: 'Your KYC verification has been approved.',
        read: true,
        createdAt: '2024-06-15T11:20:00Z'
      }
    ];

    // Apply filters
    if (type) {
      notifications = notifications.filter(notif => notif.type === type);
    }
    if (read !== undefined) {
      const isRead = read === 'true';
      notifications = notifications.filter(notif => notif.read === isRead);
    }

    // Apply pagination
    const startIndex = (page - 1) * limit;
    const paginatedNotifications = notifications.slice(startIndex, startIndex + parseInt(limit));

    // Count unread notifications
    const unreadCount = notifications.filter(notif => !notif.read).length;

    res.json({
      success: true,
      data: paginatedNotifications,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: notifications.length,
        pages: Math.ceil(notifications.length / limit)
      },
      meta: {
        unreadCount
      }
    });

  } catch (error) {
    logger.error('Notifications fetch failed:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch notifications'
    });
  }
});

// Mark notification as read
router.put('/:id/read', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    // Mock marking notification as read
    const updatedNotification = {
      id,
      read: true,
      readAt: new Date().toISOString()
    };

    res.json({
      success: true,
      data: updatedNotification
    });

  } catch (error) {
    logger.error('Notification update failed:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update notification'
    });
  }
});

// Mark all notifications as read
router.put('/mark-all-read', authenticateToken, async (req, res) => {
  try {
    const result = {
      updated: 3, // Mock number of updated notifications
      updatedAt: new Date().toISOString()
    };

    res.json({
      success: true,
      data: result
    });

  } catch (error) {
    logger.error('Mark all read failed:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to mark all notifications as read'
    });
  }
});

// Delete notification
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    // Mock notification deletion
    res.json({
      success: true,
      message: 'Notification deleted successfully'
    });

  } catch (error) {
    logger.error('Notification deletion failed:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete notification'
    });
  }
});

// Get notification preferences
router.get('/preferences', authenticateToken, async (req, res) => {
  try {
    const preferences = {
      email: {
        enabled: true,
        types: ['investment', 'dividend', 'trading', 'kyc']
      },
      push: {
        enabled: true,
        types: ['investment', 'dividend', 'system']
      },
      sms: {
        enabled: false,
        types: ['investment']
      }
    };

    res.json({
      success: true,
      data: preferences
    });

  } catch (error) {
    logger.error('Notification preferences fetch failed:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch notification preferences'
    });
  }
});

// Update notification preferences
router.put('/preferences', authenticateToken, async (req, res) => {
  try {
    const { email, push, sms } = req.body;

    const updatedPreferences = {
      email: email || { enabled: true, types: [] },
      push: push || { enabled: true, types: [] },
      sms: sms || { enabled: false, types: [] },
      updatedAt: new Date().toISOString()
    };

    res.json({
      success: true,
      data: updatedPreferences
    });

  } catch (error) {
    logger.error('Notification preferences update failed:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update notification preferences'
    });
  }
});

module.exports = router;