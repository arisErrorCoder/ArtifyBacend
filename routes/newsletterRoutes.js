// routes/newsletterRoutes.js
const express = require('express');
const router = express.Router();
const NewsletterSubscriber = require('../models/NewsletterSubscriber');
const { sendWelcomeEmail } = require('../services/newsletteremailService');

// Subscribe to newsletter
router.post('/subscribe', async (req, res) => {
  try {
    const { email } = req.body;

    // Validate email
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({ error: 'Please provide a valid email address' });
    }

    // Check if email already exists
    const existingSubscriber = await NewsletterSubscriber.findOne({ email });
    if (existingSubscriber) {
      return res.status(409).json({ error: 'This email is already subscribed' });
    }

    // Create new subscriber
    const subscriber = new NewsletterSubscriber({ email });
    await subscriber.save();

    // Send welcome email
    await sendWelcomeEmail(email);

    res.status(201).json({ message: 'Thank you for subscribing to our newsletter!' });
  } catch (error) {
    console.error('Subscription error:', error);
    res.status(500).json({ error: 'Failed to process subscription' });
  }
});

module.exports = router;