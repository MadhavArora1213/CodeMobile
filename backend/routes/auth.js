const express = require('express');
const router = express.Router();

// Auth routes for CodeMobile (M01)
// Using Firebase Client Auth for Email/Password

router.get('/status', (req, res) => {
  res.json({ message: 'Auth service is active' });
});

module.exports = router;
