const mongoose = require('mongoose');
const winston = require('winston');

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.json(),
  transports: [new winston.transports.Console()]
});

const sebiRestriction = async (req, res, next) => {
  try {
    // Assume User model exists
    const User = mongoose.model('User');
    const investorCount = await User.countDocuments({ role: 'investor' });

    // Check if SEBI approval is pending (mocked for beta)
    const SEBI_APPROVED = process.env.SEBI_APPROVED === 'true'; // Set to true post-approval
    const INVESTOR_LIMIT = 100;

    if (!SEBI_APPROVED && investorCount >= INVESTOR_LIMIT) {
      logger.warn('Investor limit reached, SEBI approval pending', { investorCount });
      return res.status(403).json({
        error: 'Investor limit reached',
        message: 'Platform access is currently limited to 100 investors pending SEBI approval.',
      });
    }

    next();
  } catch (error) {
    logger.error('SEBI restriction check failed', { error: error.message });
    res.status(500).json({ error: 'Internal server error', details: error.message });
  }
};

module.exports = sebiRestriction;