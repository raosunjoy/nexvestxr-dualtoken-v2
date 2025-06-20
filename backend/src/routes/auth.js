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
    const { 
      username, 
      email, 
      password, 
      firstName, 
      lastName, 
      phone, 
      investorType, 
      kycLevel, 
      country, 
      nationality,
      emiratesId,
      role 
    } = req.body;
    
    if (!username || !email || !password) {
      return res.status(400).json({ 
        success: false,
        error: 'Username, email, and password are required' 
      });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ 
        success: false,
        error: 'Invalid email format' 
      });
    }

    // Validate password strength (at least 8 characters, 1 uppercase, 1 lowercase, 1 number, 1 special char)
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
    if (!passwordRegex.test(password)) {
      return res.status(400).json({ 
        success: false,
        error: 'Password must be at least 8 characters with uppercase, lowercase, number, and special character' 
      });
    }

    // Check if user already exists
    const existingUser = await User.findOne({ 
      $or: [{ email }, { username }] 
    });
    
    if (existingUser) {
      return res.status(400).json({ 
        success: false,
        error: 'User already exists' 
      });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user with all fields
    const userData = {
      username,
      email,
      password: hashedPassword,
      firstName: firstName || '',
      lastName: lastName || '',
      phone: phone || '',
      investorType: investorType || 'individual',
      kycLevel: kycLevel || 'none',
      country: country || '',
      nationality: nationality || '',
      emiratesId: emiratesId || '',
      role: role || 'user'
    };

    logger.info('Creating user with data:', userData);
    const user = new User(userData);

    await user.save();
    logger.info('User saved successfully:', { userId: user._id });

    // Generate JWT token
    const token = jwt.sign(
      { id: user._id, email: user.email },
      process.env.JWT_SECRET || 'default-secret',
      { expiresIn: '24h' }
    );

    logger.info('User registered successfully', { userId: user._id, email });
    res.status(201).json({ 
      success: true,
      data: {
        token,
        user: {
          id: user._id,
          username: user.username,
          email: user.email
        }
      }
    });

  } catch (error) {
    logger.error('Registration failed', { error: error.message, stack: error.stack });
    res.status(500).json({ 
      success: false,
      error: 'Registration failed', 
      details: error.message 
    });
  }
});

// User login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    if (!email || !password) {
      return res.status(400).json({ 
        success: false,
        error: 'Email and password are required' 
      });
    }

    // Find user
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({ 
        success: false,
        error: 'Invalid credentials' 
      });
    }

    // Check password
    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword) {
      return res.status(401).json({ 
        success: false,
        error: 'Invalid credentials' 
      });
    }

    // Generate JWT token
    const token = jwt.sign(
      { id: user._id, email: user.email },
      process.env.JWT_SECRET || 'default-secret',
      { expiresIn: '24h' }
    );

    logger.info('User logged in successfully', { userId: user._id, email });
    res.json({ 
      success: true,
      data: {
        token,
        user: {
          id: user._id,
          username: user.username,
          email: user.email
        }
      }
    });

  } catch (error) {
    logger.error('Login failed', { error: error.message });
    res.status(500).json({ error: 'Login failed', details: error.message });
  }
});

// Get user profile
router.get('/profile', authenticateToken, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-password');
    if (!user) {
      return res.status(404).json({ 
        success: false, 
        error: 'User not found' 
      });
    }

    res.json({
      success: true,
      data: user
    });
  } catch (error) {
    logger.error('Profile fetch failed', { userId: req.user.id, error: error.message });
    res.status(500).json({ 
      success: false, 
      error: 'Profile fetch failed', 
      details: error.message 
    });
  }
});

// Update user profile
router.put('/profile', authenticateToken, async (req, res) => {
  try {
    const updates = req.body;
    delete updates.password; // Don't allow password updates through this route

    const user = await User.findByIdAndUpdate(
      req.user.id, 
      updates, 
      { new: true }
    ).select('-password');

    if (!user) {
      return res.status(404).json({ 
        success: false, 
        error: 'User not found' 
      });
    }

    res.json({
      success: true,
      data: user
    });
  } catch (error) {
    logger.error('Profile update failed', { userId: req.user.id, error: error.message });
    res.status(500).json({ 
      success: false, 
      error: 'Profile update failed', 
      details: error.message 
    });
  }
});

// User logout
router.post('/logout', authenticateToken, async (req, res) => {
  try {
    // In a production app, you might want to blacklist the token
    // For now, we'll just return success
    logger.info('User logged out', { userId: req.user.id });
    res.json({
      success: true,
      message: 'Logged out successfully'
    });
  } catch (error) {
    logger.error('Logout failed', { userId: req.user.id, error: error.message });
    res.status(500).json({ 
      success: false, 
      error: 'Logout failed', 
      details: error.message 
    });
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