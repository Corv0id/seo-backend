const express = require('express');
const router = express.Router();
const axios = require('axios');
const Audit = require('../models/auditModel');
const jwt = require('jsonwebtoken');
const authMiddleware = require('../middlewares/authMiddleware');
const verifyRoles = require('../middlewares/verifyRoles');

// Create an audit with PageSpeed Insights or Serpstack
router.post('/', authMiddleware, verifyRoles('admin'), async (req, res) => {
  try {
    const { domain, type, query } = req.body;
    if (!domain) return res.status(400).json({ error: 'Domain is required' });

    let seoData = {};
    let auditData = { domain, userId: req.user._id, status: 'in-progress', type };

    if (type.toLowerCase() === 'pagespeed') {
      const finalUrl = domain.includes('www.') ? `https://${domain}` : `https://www.${domain}`;
      const params = {
        url: finalUrl,
        key: process.env.GOOGLE_API_KEY,
        'category': 'performance',
        'category': 'accessibility',
        'category': 'best-practices',
        'category': 'seo'
      };
      const url = `https://www.googleapis.com/pagespeedonline/v5/runPagespeed?${new URLSearchParams(params).toString()}`;
      console.log('PageSpeed Request URL:', url);
      const response = await axios.get('https://www.googleapis.com/pagespeedonline/v5/runPagespeed', { params });
      console.log('PageSpeed Response:', JSON.stringify(response.data, null, 2));
      const data = response.data.lighthouseResult;
      if (!data) throw new Error('No lighthouseResult in PageSpeed response');
      console.log('Categories Available:', Object.keys(data.categories || {}).join(', '));
      console.log('Audits Available:', Object.keys(data.audits || {}).join(', '));
      seoData = {
        performance: (data.categories?.performance?.score || data.audits['performance']?.score || 0) * 100,
        detailedReport: {
          'first-contentful-paint': data.audits['first-contentful-paint']?.numericValue || 0,
          'largest-contentful-paint': data.audits['largest-contentful-paint']?.numericValue || 0,
          'total-blocking-time': data.audits['total-blocking-time']?.numericValue || 0,
          'cumulative-layout-shift': data.audits['cumulative-layout-shift']?.score || 0,
          'render-blocking-resources': data.audits['render-blocking-resources']?.details?.items?.length > 0 ? data.audits['render-blocking-resources'].details.items.map(item => item.url) : [],
          'uses-optimized-images': data.audits['uses-optimized-images']?.score || 0,
          'accessibility': data.audits['accessibility']?.score || 0,
          'best-practices': data.audits['best-practices']?.score || 0,
          'seo': data.audits['seo']?.score || 0,
          'runWarnings': data.runWarnings || [],
          'finalUrl': data.finalUrl
        }
      };
      auditData = {
        ...auditData,
        performanceScore: seoData.performance,
        accessibilityScore: (data.categories?.accessibility?.score || data.audits['accessibility']?.score || 0) * 100,
        bestPracticesScore: (data.categories?.['best-practices']?.score || data.audits['best-practices']?.score || 0) * 100,
        seoScore: (data.categories?.seo?.score || data.audits['seo']?.score || 0) * 100,
        seoData
      };
    } else if (type.toLowerCase() === 'serpstack') {
      const serpQuery = query || `site:${domain}`;
      const response = await axios.get('https://api.serpstack.com/search', {
        params: {
          access_key: process.env.SERPSTACK_API_KEY,
          query: serpQuery,
          num: 10
        }
      });
      seoData = {
        organic_results: response.data.organic_results,
        search_parameters: response.data.search_parameters,
        detailedReport: {
          results: response.data.organic_results?.map(result => ({
            position: result.position,
            title: result.title,
            url: result.url,
            domain: new URL(result.url).hostname
          })) || [],
          query: response.data.search_parameters?.q,
          num: response.data.search_parameters?.num,
          status: response.data.search_metadata?.status
        }
      };
      const targetDomain = domain.toLowerCase().replace(/^www\./, '');
      const rank = seoData.organic_results.findIndex(result => {
        const resultDomain = new URL(result.url).hostname.toLowerCase().replace(/^www\./, '');
        return resultDomain === targetDomain;
      }) + 1 || 0;
      auditData = {
        ...auditData,
        seoScore: rank ? (100 - (rank / 10) * 100) : 0,
        serpRank: rank,
        seoData
      };
    } else {
      return res.status(400).json({ error: 'Invalid type. Use "pagespeed" or "serpstack"' });
    }

    const audit = new Audit(auditData);
    await audit.save();
    audit.status = 'completed';
    audit.completedAt = new Date();
    await audit.save();

    res.status(201).json({ message: 'Audit created', audit });
  } catch (error) {
    console.error('Audit creation error:', error.message, error.response?.data);
    res.status(400).json({ error: error.response?.data?.message || error.message });
  }
});

// Get all audits for the authenticated user
router.get('/', authMiddleware, async (req, res) => {
  try {
    const audits = await Audit.find({ userId: req.user._id }).select({
      domain: 1,
      status: 1,
      completedAt: 1,
      _id: 1,
      type: 1,
      performanceScore: 1,
      accessibilityScore: 1,
      bestPracticesScore: 1,
      seoScore: 1,
      serpRank: 1,
      'seoData.performance': 1,
      'seoData.detailedReport': 1
    });
    res.json(audits);
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Get a specific audit by ID
router.get('/:id', authMiddleware, async (req, res) => {
  try {
    const audit = await Audit.findOne({ _id: req.params.id, userId: req.user._id }).select({
      domain: 1,
      status: 1,
      completedAt: 1,
      _id: 1,
      performanceScore: 1,
      accessibilityScore: 1,
      bestPracticesScore: 1,
      seoScore: 1,
      serpRank: 1,
      'seoData.performance': 1,
      'seoData.detailedReport': 1
    });
    if (!audit) {
      return res.status(404).json({ error: 'Audit not found or not authorized' });
    }
    res.json(audit);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Update an audit
router.put('/:id', authMiddleware, async (req, res) => {
  try {
    const { domain, type, query } = req.body;
    const audit = await Audit.findOne({ _id: req.params.id, userId: req.user._id });
    if (!audit) {
      return res.status(404).json({ error: 'Audit not found or not authorized' });
    }

    let seoData = audit.seoData;
    let updatedData = { updatedAt: Date.now() };

    if (type) {
      if (type.toLowerCase() === 'pagespeed') {
        const finalUrl = domain ? (domain.includes('www.') ? `https://${domain}` : `https://www.${domain}`) : audit.domain;
        const params = {
          url: finalUrl,
          key: process.env.GOOGLE_API_KEY,
          'category': 'seo',
          'category': 'accessibility',
          'category': 'best-practices',
          'category': 'performance'
        };
        const url = `https://www.googleapis.com/pagespeedonline/v5/runPagespeed?${new URLSearchParams(params).toString()}`;
        console.log('PageSpeed Request URL:', url);
        const response = await axios.get('https://www.googleapis.com/pagespeedonline/v5/runPagespeed', { params });
        console.log('PageSpeed Response:', JSON.stringify(response.data, null, 2));
        const data = response.data.lighthouseResult;
        if (!data) throw new Error('No lighthouseResult in PageSpeed response');
        console.log('Categories Available:', Object.keys(data.categories || {}).join(', '));
        console.log('Audits Available:', Object.keys(data.audits || {}).join(', '));
        seoData = {
          performance: (data.categories?.performance?.score || data.audits['performance']?.score || 0) * 100,
          detailedReport: {
            'first-contentful-paint': data.audits['first-contentful-paint']?.numericValue || 0,
            'largest-contentful-paint': data.audits['largest-contentful-paint']?.numericValue || 0,
            'total-blocking-time': data.audits['total-blocking-time']?.numericValue || 0,
            'cumulative-layout-shift': data.audits['cumulative-layout-shift']?.score || 0,
            'render-blocking-resources': data.audits['render-blocking-resources']?.details?.items?.length > 0 ? data.audits['render-blocking-resources'].details.items.map(item => item.url) : [],
            'uses-optimized-images': data.audits['uses-optimized-images']?.score || 0,
            'accessibility': data.audits['accessibility']?.score || 0,
            'best-practices': data.audits['best-practices']?.score || 0,
            'seo': data.audits['seo']?.score || 0,
            'runWarnings': data.runWarnings || [],
            'finalUrl': data.finalUrl
          }
        };
        updatedData = {
          ...updatedData,
          performanceScore: seoData.performance,
          accessibilityScore: (data.categories?.accessibility?.score || data.audits['accessibility']?.score || 0) * 100,
          bestPracticesScore: (data.categories?.['best-practices']?.score || data.audits['best-practices']?.score || 0) * 100,
          seoScore: (data.categories?.seo?.score || data.audits['seo']?.score || 0) * 100,
          seoData
        };
      } else if (type.toLowerCase() === 'serpstack') {
        const serpQuery = query || `site:${domain || audit.domain}`;
        const response = await axios.get('https://api.serpstack.com/search', {
          params: {
            access_key: process.env.SERPSTACK_API_KEY,
            query: serpQuery,
            num: 10
          }
        });
        seoData = {
          organic_results: response.data.organic_results,
          search_parameters: response.data.search_parameters,
          detailedReport: {
            results: response.data.organic_results?.map(result => ({
              position: result.position,
              title: result.title,
              url: result.url,
              domain: new URL(result.url).hostname
            })) || [],
            query: response.data.search_parameters?.q,
            num: response.data.search_parameters?.num,
            status: response.data.search_metadata?.status
          }
        };
        const targetDomain = (domain || audit.domain).toLowerCase().replace(/^www\./, '');
        const rank = seoData.organic_results.findIndex(result => {
          const resultDomain = new URL(result.url).hostname.toLowerCase().replace(/^www\./, '');
          return resultDomain === targetDomain;
        }) + 1 || 0;
        updatedData = {
          ...updatedData,
          seoScore: rank ? (100 - (rank / 10) * 100) : audit.seoScore,
          serpRank: rank,
          seoData
        };
      } else {
        return res.status(400).json({ error: 'Invalid type. Use "pagespeed" or "serpstack"' });
      }
    }

    if (domain) audit.domain = domain;
    Object.assign(audit, updatedData);
    await audit.save();
    res.json({ message: 'Audit updated', audit });
  } catch (error) {
    console.error('Audit update error:', error.message, error.response?.data);
    res.status(400).json({ error: error.message });
  }
});

// Delete an audit
router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    const audit = await Audit.findOneAndDelete({ _id: req.params.id, userId: req.user._id });
    if (!audit) {
      return res.status(404).json({ error: 'Audit not found or not authorized' });
    }
    res.json({ message: 'Audit deleted' });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

module.exports = router;