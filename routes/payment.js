const express = require('express');
const router = express.Router();
const stripe = require('../config/stripe');

// Create Payment Intent
// In routes/payment.js
// routes/payment.js
// In your Node.js backend route
router.post('/create-payment-intent', async (req, res) => {
    try {
      const { amount, currency = 'inr', metadata } = req.body;
  
      const paymentIntent = await stripe.paymentIntents.create({
        amount: Number(amount),
        currency,
        payment_method_types: ['card'],
        description: 'Digital artwork purchase', // Required for Indian exports
        metadata: metadata || {},
        statement_descriptor: 'ARTIFY',
        statement_descriptor_suffix: 'ART',
        shipping: {
          name: `${metadata.customer_name}`,
          address: {
            line1: metadata.address,
            city: metadata.city,
            state: metadata.state,
            postal_code: metadata.zipCode,
            country: metadata.country || 'IN'
          }
        }
      });
  
      res.json({
        success: true,
        clientSecret: paymentIntent.client_secret,
        paymentIntentId: paymentIntent.id
      });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

// Webhook for payment confirmation
router.post('/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
  const sig = req.headers['stripe-signature'];
  const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;

  let event;

  try {
    event = stripe.webhooks.constructEvent(req.body, sig, endpointSecret);
  } catch (err) {
    console.error(`Webhook Error: ${err.message}`);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  // Handle the event
  switch (event.type) {
    case 'payment_intent.succeeded':
      const paymentIntent = event.data.object;
      console.log('PaymentIntent was successful:', paymentIntent.id);
      // Update your database here
      break;
    case 'payment_intent.payment_failed':
      const failedIntent = event.data.object;
      console.log('PaymentIntent failed:', failedIntent.id);
      break;
    default:
      console.log(`Unhandled event type ${event.type}`);
  }

  res.json({ received: true });
});

// Get payment details
router.get('/payment/:id', async (req, res) => {
  try {
    const paymentIntent = await stripe.paymentIntents.retrieve(req.params.id);
    res.json(paymentIntent);
  } catch (error) {
    console.error('Error retrieving payment intent:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;