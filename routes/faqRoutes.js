const express = require('express');
const router = express.Router();
const faqController = require('../controllers/faqController');

// Handle FAQ question submission
router.post('/submit-question', faqController.sendQuestion);

module.exports = router;