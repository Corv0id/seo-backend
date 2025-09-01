const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const userSchema = new mongoose.Schema({
  name: { type: String, required: [true, 'Name is required'], trim: true },
  email: { type: String, required: [true, 'Email is required'], unique: true, lowercase: true, match: [/.+\@.+\..+/, 'Please enter a valid email address'] },
  password: { type: String, required: [true, 'Password is required'], minlength: [6, 'Password must be at least 6 characters long'] },
  role: { type: String, enum: ['user', 'admin'], default: 'user' },
  createdAt: { type: Date, default: Date.now },
  refreshToken: { type: String } // New field for refresh token
});

// Hash password before saving only if not already hashed
userSchema.pre('save', async function(next) {
  if (!this.isModified('password') || this.password.startsWith('$2b$')) return next(); // Skip if already hashed
  try {
    console.log('Hashing password:', this.password);
    this.password = await bcrypt.hash(this.password, 10);
    console.log('Hashed password:', this.password);
    next();
  } catch (error) {
    next(error);
  }
});

// Compare passwords for authentication
userSchema.methods.comparePassword = async function(password) {
  return await bcrypt.compare(password, this.password);
};

// Generate JWT token (access token)
userSchema.methods.generateAuthToken = function() {
  const token = jwt.sign(
    { userId: this._id, role: this.role },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '15m' } // Default to 15 minutes if not set
  );
  return token;
};

// Generate refresh token
userSchema.methods.generateRefreshToken = function() {
  const token = jwt.sign(
    { userId: this._id, role: this.role },
    process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET,
    { expiresIn: '7d' } // Default to 7 days
  );
  return token;
};

module.exports = mongoose.model('User', userSchema);