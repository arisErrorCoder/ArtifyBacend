const nodemailer = require('nodemailer');
const ejs = require('ejs');
const path = require('path');
const fs = require('fs');

// Create transporter
const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST,
  port: process.env.EMAIL_PORT,
  secure: process.env.EMAIL_SECURE === 'true',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASSWORD
  }
});

// Read email templates
const orderConfirmationTemplate = fs.readFileSync(
  path.join(__dirname, '../templates/orderConfirmation.ejs'), 
  'utf-8'
);
const adminNotificationTemplate = fs.readFileSync(
  path.join(__dirname, '../templates/adminNotification.ejs'), 
  'utf-8'
);
const statusUpdateTemplate = fs.readFileSync(
  path.join(__dirname, '../templates/statusUpdate.ejs'), 
  'utf-8'
);

async function sendOrderConfirmationEmail(email, order) {
  try {
    const html = ejs.render(orderConfirmationTemplate, { order });

    await transporter.sendMail({
      from: `"Artify" <${process.env.EMAIL_FROM}>`,
      to: email,
      subject: `Your Artify Order #${order._id.toString().slice(-6).toUpperCase()}`,
      html
    });

    console.log(`Order confirmation email sent to ${email}`);
  } catch (error) {
    console.error('Error sending order confirmation email:', error);
  }
}

async function sendAdminNotification(order) {
  try {
    const html = ejs.render(adminNotificationTemplate, { order });

    await transporter.sendMail({
      from: `"Artify" <${process.env.EMAIL_FROM}>`,
      to: process.env.ADMIN_EMAIL,
      subject: `New Order Received - #${order._id.toString().slice(-6).toUpperCase()}`,
      html
    });

    console.log('Admin notification sent');
  } catch (error) {
    console.error('Error sending admin notification:', error);
  }
}

async function sendOrderStatusUpdateEmail(email, order) {
  try {
    const html = ejs.render(statusUpdateTemplate, { order });

    await transporter.sendMail({
      from: `"Artify" <${process.env.EMAIL_FROM}>`,
      to: email,
      subject: `Your Order Status Update - #${order._id.toString().slice(-6).toUpperCase()}`,
      html
    });

    console.log(`Order status update email sent to ${email}`);
  } catch (error) {
    console.error('Error sending status update email:', error);
  }
}

module.exports = {
  sendOrderConfirmationEmail,
  sendAdminNotification,
  sendOrderStatusUpdateEmail
};