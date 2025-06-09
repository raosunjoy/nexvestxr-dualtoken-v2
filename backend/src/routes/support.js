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