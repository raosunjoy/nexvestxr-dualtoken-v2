// routes/authRoutes.js - Complete authentication system
const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');
const speakeasy = require('speakeasy');
const QRCode = require('qrcode');
const router = express.Router();

const { User } = require('../database/schemas/currencySchemas');
const CurrencyService = require('../services/CurrencyService');
const auth = require('../middleware/auth');

// Validation middleware
const validateRegistration = [
  body('email').isEmail().normalizeEmail(),
  body('password').isLength({ min: 8 }).withMessage('Password must be at least 8 characters'),
  body('userType').isIn(['consumer', 'property_owner', 'developer']).withMessage('Invalid user type'),
  body('country').optional().isLength({ min: 2, max: 3 }),
  body('preferredCurrency').optional().isIn(['USD', 'EUR', 'GBP', 'SGD', 'INR'])
];

const validateLogin = [
  body('email').isEmail().normalizeEmail(),
  body('password').notEmpty().withMessage('Password is required')
];

// Register new user
router.post('/register', validateRegistration, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: errors.array()
      });
    }

    const { email, password, userType, country, preferredCurrency } = req.body;

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(409).json({
        success: false,
        error: 'User already exists with this email'
      });
    }

    // Hash password
    const saltRounds = parseInt(process.env.BCRYPT_ROUNDS) || 12;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    // Detect currency if not provided
    const finalCurrency = preferredCurrency || req.detectedCurrency || 'USD';
    const finalCountry = country || req.detectedLocation?.country || 'Unknown';

    // Create user
    const userData = {
      email,
      password: hashedPassword,
      userType,
      country: finalCountry,
      detectedCountry: req.detectedLocation?.country,
      preferredCurrency: finalCurrency,
      detectedCurrency: req.detectedCurrency,
      timezone: req.detectedLocation?.timezone,
      createdAt: new Date(),
      kycStatus: 'pending',
      totalInvestment: {
        usd: 0,
        displayCurrency: finalCurrency,
        displayAmount: 0
      }
    };

    const user = new User(userData);
    await user.save();

    // Generate JWT token
    const token = jwt.sign(
      { 
        userId: user._id, 
        email: user.email,
        userType: user.userType 
      },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    // Return user data (excluding password)
    const userResponse = user.toObject();
    delete userResponse.password;

    res.status(201).json({
      success: true,
      message: 'User registered successfully',
      data: {
        user: userResponse,
        token,
        expiresIn: '7d'
      }
    });

    console.log(`✅ New user registered: ${email} (${userType}) - ${finalCurrency}`);

  } catch (error) {
    console.error('❌ Registration failed:', error);
    res.status(500).json({
      success: false,
      error: 'Registration failed'
    });
  }
});

// Login user
router.post('/login', validateLogin, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: errors.array()
      });
    }

    const { email, password, twoFactorCode } = req.body;

    // Find user
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({
        success: false,
        error: 'Invalid email or password'
      });
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        error: 'Invalid email or password'
      });
    }

    // Check 2FA if enabled
    if (user.twoFactorEnabled) {
      if (!twoFactorCode) {
        return res.status(200).json({
          success: true,
          requiresTwoFactor: true,
          message: 'Two-factor authentication required'
        });
      }

      const isValidToken = speakeasy.totp.verify({
        secret: user.twoFactorSecret,
        encoding: 'base32',
        token: twoFactorCode,
        window: 2
      });

      if (!isValidToken) {
        return res.status(401).json({
          success: false,
          error: 'Invalid two-factor authentication code'
        });
      }
    }

    // Update last login
    user.lastLoginAt = new Date();
    await user.save();

    // Generate JWT token
    const token = jwt.sign(
      { 
        userId: user._id, 
        email: user.email,
        userType: user.userType 
      },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    // Return user data (excluding sensitive fields)
    const userResponse = user.toObject();
    delete userResponse.password;
    delete userResponse.twoFactorSecret;

    res.json({
      success: true,
      message: 'Login successful',
      data: {
        user: userResponse,
        token,
        expiresIn: '7d'
      }
    });

    console.log(`✅ User logged in: ${email}`);

  } catch (error) {
    console.error('❌ Login failed:', error);
    res.status(500).json({
      success: false,
      error: 'Login failed'
    });
  }
});

// Get user profile
router.get('/profile', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId).select('-password -twoFactorSecret');
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    // Calculate portfolio value in user's preferred currency
    const portfolioValue = await CurrencyService.calculatePortfolioValue(
      user._id, 
      user.preferredCurrency
    );

    res.json({
      success: true,
      data: {
        user: user.toObject(),
        portfolio: portfolioValue
      }
    });

  } catch (error) {
    console.error('❌ Failed to get user profile:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get user profile'
    });
  }
});

// Update user profile
router.put('/profile', auth, async (req, res) => {
  try {
    const { preferredCurrency, country, timezone, preferences } = req.body;
    const userId = req.user.userId;

    const updateData = {};
    
    if (preferredCurrency && ['USD', 'EUR', 'GBP', 'SGD', 'INR'].includes(preferredCurrency)) {
      updateData.preferredCurrency = preferredCurrency;
    }
    
    if (country) updateData.country = country;
    if (timezone) updateData.timezone = timezone;
    if (preferences) updateData.preferences = { ...preferences };
    
    updateData.updatedAt = new Date();

    const user = await User.findByIdAndUpdate(userId, updateData, { new: true })
      .select('-password -twoFactorSecret');

    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    res.json({
      success: true,
      message: 'Profile updated successfully',
      data: { user }
    });

  } catch (error) {
    console.error('❌ Failed to update profile:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update profile'
    });
  }
});

// Setup 2FA
router.post('/setup-2fa', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    // Generate secret
    const secret = speakeasy.generateSecret({
      name: `NexVestXR (${user.email})`,
      issuer: 'NexVestXR'
    });

    // Generate QR code
    const qrCodeUrl = await QRCode.toDataURL(secret.otpauth_url);

    // Save secret to user (but don't enable 2FA yet)
    user.twoFactorSecret = secret.base32;
    user.twoFactorEnabled = false;
    await user.save();

    res.json({
      success: true,
      data: {
        secret: secret.base32,
        qrCode: qrCodeUrl,
        manualEntryKey: secret.base32
      }
    });

  } catch (error) {
    console.error('❌ Failed to setup 2FA:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to setup 2FA'
    });
  }
});

// Verify and enable 2FA
router.post('/verify-2fa', auth, async (req, res) => {
  try {
    const { token } = req.body;
    
    if (!token) {
      return res.status(400).json({
        success: false,
        error: 'Token is required'
      });
    }

    const user = await User.findById(req.user.userId);
    if (!user || !user.twoFactorSecret) {
      return res.status(400).json({
        success: false,
        error: 'Two-factor authentication not set up'
      });
    }

    // Verify token
    const isValidToken = speakeasy.totp.verify({
      secret: user.twoFactorSecret,
      encoding: 'base32',
      token: token,
      window: 2
    });

    if (!isValidToken) {
      return res.status(400).json({
        success: false,
        error: 'Invalid token'
      });
    }

    // Enable 2FA
    user.twoFactorEnabled = true;
    await user.save();

    res.json({
      success: true,
      message: 'Two-factor authentication enabled successfully'
    });

  } catch (error) {
    console.error('❌ Failed to verify 2FA:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to verify 2FA'
    });
  }
});

// Disable 2FA
router.post('/disable-2fa', auth, async (req, res) => {
  try {
    const { password, token } = req.body;
    
    if (!password || !token) {
      return res.status(400).json({
        success: false,
        error: 'Password and 2FA token are required'
      });
    }

    const user = await User.findById(req.user.userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        error: 'Invalid password'
      });
    }

    // Verify 2FA token
    const isValidToken = speakeasy.totp.verify({
      secret: user.twoFactorSecret,
      encoding: 'base32',
      token: token,
      window: 2
    });

    if (!isValidToken) {
      return res.status(400).json({
        success: false,
        error: 'Invalid 2FA token'
      });
    }

    // Disable 2FA
    user.twoFactorEnabled = false;
    user.twoFactorSecret = undefined;
    await user.save();

    res.json({
      success: true,
      message: 'Two-factor authentication disabled successfully'
    });

  } catch (error) {
    console.error('❌ Failed to disable 2FA:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to disable 2FA'
    });
  }
});

// Change password
router.post('/change-password', auth, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    
    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        error: 'Current password and new password are required'
      });
    }

    if (newPassword.length < 8) {
      return res.status(400).json({
        success: false,
        error: 'New password must be at least 8 characters long'
      });
    }

    const user = await User.findById(req.user.userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    // Verify current password
    const isCurrentPasswordValid = await bcrypt.compare(currentPassword, user.password);
    if (!isCurrentPasswordValid) {
      return res.status(401).json({
        success: false,
        error: 'Current password is incorrect'
      });
    }

    // Hash new password
    const saltRounds = parseInt(process.env.BCRYPT_ROUNDS) || 12;
    const hashedNewPassword = await bcrypt.hash(newPassword, saltRounds);

    // Update password
    user.password = hashedNewPassword;
    user.updatedAt = new Date();
    await user.save();

    res.json({
      success: true,
      message: 'Password changed successfully'
    });

    console.log(`✅ Password changed for user: ${user.email}`);

  } catch (error) {
    console.error('❌ Failed to change password:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to change password'
    });
  }
});

// Logout (client-side token removal, but we can track it)
router.post('/logout', auth, async (req, res) => {
  try {
    // In a production system, you might want to blacklist the token
    // For now, we'll just log the logout event
    const user = await User.findById(req.user.userId);
    if (user) {
      console.log(`✅ User logged out: ${user.email}`);
    }

    res.json({
      success: true,
      message: 'Logged out successfully'
    });

  } catch (error) {
    console.error('❌ Logout failed:', error);
    res.status(500).json({
      success: false,
      error: 'Logout failed'
    });
  }
});

// Refresh token
router.post('/refresh-token', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId).select('-password -twoFactorSecret');
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    // Generate new token
    const token = jwt.sign(
      { 
        userId: user._id, 
        email: user.email,
        userType: user.userType 
      },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({
      success: true,
      data: {
        token,
        user,
        expiresIn: '7d'
      }
    });

  } catch (error) {
    console.error('❌ Token refresh failed:', error);
    res.status(500).json({
      success: false,
      error: 'Token refresh failed'
    });
  }
});

module.exports = router;