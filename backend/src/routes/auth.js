const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { authenticateToken } = require('../middleware/auth');
const winston = require('winston');
const { v4: uuidv4 } = require('uuid');
const mongoose = require('mongoose');

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.json(),
  transports: [new winston.transports.Console()]
});

const router = express.Router();

// Mock user model (assumed to exist)
const User = mongoose.model('User');

// User registration
router.post('/register', async (req, res) => {
  try {
    const { username, email, password } = req.body;
    
    if (!username || !email || !password) {
      return res.status(400).json({ error: 'Username, email, and password are required' });
    }

    // Check if user already exists
    const existingUser = await User.findOne({ 
      $or: [{ email }, { username }] 
    });
    
    if (existingUser) {
      return res.status(400).json({ error: 'User already exists' });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user
    const user = new User({
      username,
      email,
      password: hashedPassword
    });

    await user.save();

    logger.info('User registered successfully', { userId: user._id, email });
    res.status(201).json({ 
      message: 'User registered successfully', 
      userId: user._id 
    });

  } catch (error) {
    logger.error('Registration failed', { error: error.message });
    res.status(500).json({ error: 'Registration failed', details: error.message });
  }
});

// User login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    // Find user
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Check password
    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Generate JWT token
    const token = jwt.sign(
      { id: user._id, email: user.email },
      process.env.JWT_SECRET || 'default-secret',
      { expiresIn: '24h' }
    );

    logger.info('User logged in successfully', { userId: user._id, email });
    res.json({ 
      message: 'Login successful', 
      token,
      user: {
        id: user._id,
        username: user.username,
        email: user.email
      }
    });

  } catch (error) {
    logger.error('Login failed', { error: error.message });
    res.status(500).json({ error: 'Login failed', details: error.message });
  }
});

// Generate API key for Institutional plan users
router.post('/api-key', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Check subscription plan
    const subscription = await require('../services/SubscriptionService').getUserSubscription(userId, 'investor');
    if (subscription.plan !== 'institutional') {
      return res.status(403).json({ error: 'API key generation requires Institutional plan' });
    }

    // Generate API key
    const apiKey = uuidv4();
    user.apiKey = apiKey;
    await user.save();

    logger.info('API key generated', { userId, apiKey });
    res.json({ success: true, apiKey });
  } catch (error) {
    logger.error('API key generation failed', { userId: req.user.id, error: error.message });
    res.status(500).json({ error: 'API key generation failed', details: error.message });
  }
});

module.exports = router;