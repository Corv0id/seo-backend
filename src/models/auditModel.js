const mongoose = require('mongoose');

  const auditSchema = new mongoose.Schema({
    domain: { type: String, required: true }, // Changed from url to domain
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    type: { type: String, enum: ['pagespeed', 'serpstack'], required: true },
    status: { type: String, enum: ['pending', 'in-progress', 'completed', 'failed'], default: 'pending' },
    seoScore: { type: Number, min: 0, max: 100 },
    performanceScore: { type: Number, min: 0, max: 100 },
    accessibilityScore: { type: Number, min: 0, max: 100 },
    bestPracticesScore: { type: Number, min: 0, max: 100 },
    seoData: { type: Object },
    serpRank: { type: Number },
    startedAt: { type: Date, default: Date.now },
    completedAt: { type: Date },
    reportId: { type: mongoose.Schema.Types.ObjectId, ref: 'Report' }
  });

  module.exports = mongoose.model('Audit', auditSchema);