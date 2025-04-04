const express = require('express');
const router = express.Router();
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const Order = require('../models/Order');
const User = require('../models/User');
const { sendOrderConfirmationEmail, sendAdminNotification } = require('../services/emailService');

// Create Payment Intent
router.post('/create-payment-intent', async (req, res) => {
  try {
    const { amount, currency = 'inr', metadata } = req.body;

    const paymentIntent = await stripe.paymentIntents.create({
      amount: Number(amount),
      currency,
      payment_method_types: ['card'],
      description: 'Digital artwork purchase',
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

// Webhook endpoint for Stripe events
router.post('/webhook', express.raw({type: 'application/json'}), async (req, res) => {
  const sig = req.headers['stripe-signature'];
  let event;

  try {
    event = stripe.webhooks.constructEvent(
      req.body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (err) {
    console.error('Webhook signature verification failed:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  // Handle the event
  switch (event.type) {
    case 'payment_intent.succeeded':
      const paymentIntent = event.data.object;
      await handlePaymentIntentSucceeded(paymentIntent);
      break;
    case 'payment_intent.payment_failed':
      const paymentFailed = event.data.object;
      await handlePaymentIntentFailed(paymentFailed);
      break;
    case 'payment_intent.created':
      console.log(`PaymentIntent created: ${event.data.object.id}`);
      break;
    default:
      console.log(`Unhandled event type ${event.type}`);
  }

  res.json({received: true});
});
// In paymentRoutes.js
// Add this new endpoint for manual testing
// New endpoint for manual email triggering
router.post('/trigger-emails', async (req, res) => {
  try {
    const { orderId, paymentIntentId } = req.body;
    console.log(`MANUAL EMAIL TRIGGER for order ${orderId}`);

    const order = await Order.findById(orderId).populate('user');
    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    // Send emails
    await sendOrderConfirmationEmail(order.user.email, order);
    await sendAdminNotification(order);

    res.json({ success: true, message: 'Emails triggered manually' });
  } catch (error) {
    console.error('Email triggering failed:', error);
    res.status(500).json({ error: error.message });
  }
});
async function handlePaymentIntentSucceeded(paymentIntent) {
  try {
    // Find and update the order
    const order = await Order.findOneAndUpdate(
      { paymentIntentId: paymentIntent.id },
      { 
        paymentStatus: 'succeeded',
        $set: {
          'paymentDetails': paymentIntent
        }
      },
      { new: true }
    );
    
    if (!order) {
      console.error('Order not found for payment intent:', paymentIntent.id);
      return;
    }

    // Get user details
    const user = await User.findById(order.user);
    
    if (user) {
      // Send confirmation email to customer
      await sendOrderConfirmationEmail(user.email, order);
      // Send notification to admin
      await sendAdminNotification(order);
    }

    console.log(`Successfully processed payment for order ${order._id}`);

  } catch (error) {
    console.error('Error handling payment intent succeeded:', error);
  }
}

async function handlePaymentIntentFailed(paymentIntent) {
  try {
    const order = await Order.findOneAndUpdate(
      { paymentIntentId: paymentIntent.id },
      { 
        paymentStatus: 'failed',
        $set: {
          'paymentDetails': paymentIntent
        }
      },
      { new: true }
    );
    
    if (!order) {
      console.error('Order not found for failed payment intent:', paymentIntent.id);
      return;
    }

    console.log(`Payment failed for order ${order._id}`);
    
  } catch (error) {
    console.error('Error handling payment intent failed:', error);
  }
}

module.exports = router;