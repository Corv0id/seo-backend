// authMiddleware.js
require('dotenv').config();
const jwt = require('jsonwebtoken');

const authMiddleware = async (req, res, next) => {
  try {
    // 1. Try the Authorization header first
    let token = req.header('Authorization')?.replace('Bearer ', '');

    // 2. If no header, fall back to the refresh-token cookie
    if (!token && req.cookies?.refreshToken) {
      token = req.cookies.refreshToken;
    }

    console.log('Received token:', token);

    if (!token) {
      return res.status(401).json({ error: 'No token provided' });
    }

    // Decide which secret to use
    const secret =
      !req.header('Authorization') && req.cookies?.refreshToken
        ? process.env.REFRESH_TOKEN_SECRET   // refresh-token secret
        : process.env.JWT_SECRET;            // access-token secret

    const decoded = jwt.verify(token, secret);
    console.log('Decoded token:', decoded);

    const User = require('../models/userModel');
    const user = await User.findById(decoded.userId || decoded.id); // handle either key
    if (!user) {
      return res.status(401).json({ error: 'User not found' });
    }

    req.user = user;
    req.roles = decoded.role;
    console.log('User roles:', req.roles);
    next();
  } catch (error) {
    console.error('JWT verification error:', error.message);
    res.status(401).json({ error: 'Invalid token' });
  }
};

module.exports = authMiddleware;