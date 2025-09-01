const mongoose = require('mongoose');

const reportSchema = new mongoose.Schema({
  auditId: { type: mongoose.Schema.Types.ObjectId, ref: 'Audit', required: true },

  // Lighthouse & SEO metrics
  lighthouseReport: { type: Object },  // Full JSON from Lighthouse
  seoIssues: [{                        // Found SEO issues
    type: { type: String },             // "meta", "link", "performance"
    description: String,
    severity: { type: String, enum: ['low', 'medium', 'high'] }
  }],

  // API Data
  googleSearchConsole: { type: Object }, // Indexed pages, CTR, impressions
  ahrefsData: { type: Object },          // Backlinks, domain rating, keywords

  // Recommendations
  recommendations: [{ type: String }],

  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Report', reportSchema);
