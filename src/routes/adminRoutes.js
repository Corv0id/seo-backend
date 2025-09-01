const express = require('express');
  const router = express.Router();
  const authMiddleware = require('../middlewares/authMiddleware');
  const verifyRoles = require('../middlewares/verifyRoles');

  router.get('/test', authMiddleware, verifyRoles('admin'), (req, res) => {
    res.json({ message: 'This is an admin-only test route (GET). Welcome, Admin!' });
  });

  router.post('/test', authMiddleware, verifyRoles('admin'), (req, res) => {
    res.json({ message: 'This is an admin-only test route (POST). Welcome, Admin!', data: req.body });
  });

  module.exports = router;