const express = require('express');
const router = express.Router();
const User = require('../models/userModel');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const authMiddleware = require('../middlewares/authMiddleware');
const cookieParser = require('cookie-parser');

router.use(express.json());
router.use(cookieParser());

// Register route for both user and admin
router.post('/register', async (req, res) => {
  try {
    const { name, email, password, role = 'user' } = req.body;
    console.log('Registering with:', { name, email, password, role });
    const existingUser = await User.findOne({ email });
    if (existingUser) return res.status(400).json({ error: 'Email already exists' });
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);
    console.log('Hashed password before save:', hashedPassword);
    const user = new User({ name, email, password: hashedPassword, role });
    await user.save();
    console.log('Saved user password:', user.password);
    res.status(201).json({ message: 'User registered', user: { name, email, role } });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Login route for both user and admin
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    console.log('Login attempt:', { email, password });
    const user = await User.findOne({ email });
    console.log('Found user:', user);
    if (!user) return res.status(401).json({ error: 'Invalid email or password' });
    const match = await user.comparePassword(password);
    console.log('Password match:', match);
    if (!match) return res.status(401).json({ error: 'Invalid email or password' });

    // Generate access token (short-lived, e.g., 15 minutes)
    const accessToken = user.generateAuthToken();

    // Generate refresh token (long-lived, e.g., 7 days)
    const refreshToken = user.generateRefreshToken();

    // Save refresh token to user
    user.refreshToken = refreshToken;
    await user.save();

    // Send tokens to client (access token in body, refresh token in HTTP-only cookie)
    res.cookie('refreshToken', refreshToken, { httpOnly: true, secure: true, sameSite: 'strict' });
    res.status(200).json({ accessToken, role: user.role, message: 'Login successful' });
  } catch (error) {
    console.error('Login error:', error.message);
    res.status(400).json({ error: error.message });
  }
});

// Refresh token route for both user and admin (regenerates only access token)
router.post('/refresh', async (req, res) => {
  try {
    const refreshToken = req.cookies.refreshToken;
    if (!refreshToken) return res.status(401).json({ error: 'No refresh token provided' });

    // Verify refresh token
    const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET);
    const user = await User.findById(decoded.userId);
    if (!user || user.refreshToken !== refreshToken) {
      return res.status(403).json({ error: 'Invalid refresh token' });
    }

    // Generate new access token only
    const accessToken = user.generateAuthToken();

    // Keep existing refresh token
    res.cookie('refreshToken', refreshToken, { httpOnly: true, secure: true, sameSite: 'strict' });
    res.status(200).json({ accessToken, role: user.role, message: 'Token refreshed' });
  } catch (error) {
    console.error('Refresh error:', error.message);
    if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
      return res.status(403).json({ error: 'Invalid or expired refresh token' });
    }
    res.status(400).json({ error: 'Refresh failed' });
  }
});

// Logout route for both user and admin
router.post('/logout', authMiddleware, async (req, res) => {
  try {
    console.log('Req.user:', req.user);
    const userId = req.user._id;
    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ error: 'User not found' });
    user.refreshToken = null;
    await user.save();
    res.clearCookie('refreshToken', { httpOnly: true, secure: true, sameSite: 'strict' });
    res.status(200).json({ message: 'Logout successful' });
  } catch (error) {
    console.error('Logout error:', error.message);
    res.status(400).json({ error: 'Logout failed' });
  }
});

// Profile route for both user and admin
router.get('/profile', authMiddleware, async (req, res) => {
  try {
    res.json({
    email: req.user.email,
    name:  req.user.name  || '',
    role:  req.user.role  || '',
    createdAt: req.user.createdAt,
  });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;