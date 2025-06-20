const express = require('express');
const { authenticateToken } = require('../middleware/auth');
const winston = require('winston');
const axios = require('axios');

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.json(),
  transports: [new winston.transports.Console()]
});

const router = express.Router();

// Get user support tickets
router.get('/tickets', authenticateToken, async (req, res) => {
  try {
    const { status, limit = 10 } = req.query;

    // Mock tickets data
    let tickets = [
      {
        ticketId: 'TICK_001',
        subject: 'Investment Inquiry',
        category: 'investment',
        priority: 'medium',
        status: 'OPEN',
        message: 'I need help with my property investment process.',
        createdAt: '2024-06-20T10:30:00Z',
        updatedAt: '2024-06-20T10:30:00Z'
      },
      {
        ticketId: 'TICK_002',
        subject: 'Account Issue',
        category: 'account',
        priority: 'high',
        status: 'RESOLVED',
        message: 'Unable to access my portfolio dashboard.',
        createdAt: '2024-06-19T14:15:00Z',
        updatedAt: '2024-06-19T16:20:00Z',
        resolvedAt: '2024-06-19T16:20:00Z'
      }
    ];

    // Apply filters
    if (status) {
      tickets = tickets.filter(ticket => ticket.status === status);
    }

    tickets = tickets.slice(0, parseInt(limit));

    res.json({
      success: true,
      data: tickets
    });

  } catch (error) {
    logger.error('Support tickets fetch failed:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch support tickets'
    });
  }
});

// Get FAQ
router.get('/faq', async (req, res) => {
  try {
    const { lang = 'en', category } = req.query;

    // Mock FAQ data
    const faqData = {
      en: {
        investment: [
          {
            id: 'faq_001',
            question: 'How do I start investing in real estate?',
            answer: 'To start investing, create an account, complete KYC verification, and browse available properties on our platform.',
            category: 'investment',
            language: 'en'
          },
          {
            id: 'faq_002',
            question: 'What is the minimum investment amount?',
            answer: 'The minimum investment varies by property, typically starting from AED 10,000.',
            category: 'investment',
            language: 'en'
          }
        ],
        general: [
          {
            id: 'faq_003',
            question: 'How secure is the platform?',
            answer: 'We use bank-grade security with SSL encryption and multi-factor authentication.',
            category: 'general',
            language: 'en'
          }
        ]
      },
      ar: {
        general: [
          {
            id: 'faq_004',
            question: 'ما مدى أمان المنصة؟',
            answer: 'نحن نستخدم أمان بمستوى البنوك مع تشفير SSL والمصادقة متعددة العوامل.',
            category: 'general',
            language: 'ar'
          }
        ]
      }
    };

    let faq = [];
    if (category && faqData[lang] && faqData[lang][category]) {
      faq = faqData[lang][category];
    } else if (faqData[lang]) {
      faq = Object.values(faqData[lang]).flat();
    }

    res.json({
      success: true,
      data: faq
    });

  } catch (error) {
    logger.error('FAQ fetch failed:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch FAQ'
    });
  }
});

// Submit a support ticket via Intercom
router.post('/ticket', authenticateToken, async (req, res) => {
  try {
    const { subject, message } = req.body;
    const userId = req.user.id;
    const userEmail = req.user.email || `user-${userId}@nexvestxr.com`;

    const response = await axios.post(
      'https://api.intercom.io/conversations',
      {
        from: {
          type: 'user',
          email: userEmail,
        },
        body: `${subject}\n\n${message}`,
      },
      {
        headers: {
          'Authorization': `Bearer ${process.env.INTERCOM_ACCESS_TOKEN}`,
          'Content-Type': 'application/json',
          'Intercom-Version': '2.0',
        },
      }
    );

    logger.info('Support ticket submitted via Intercom', { userId, ticketId: response.data.id });
    res.json({ success: true, ticketId: response.data.id });
  } catch (error) {
    logger.error('Support ticket submission failed', { userId: req.user.id, error: error.message });
    res.status(500).json({ error: 'Ticket submission failed', details: error.message });
  }
});

module.exports = router;