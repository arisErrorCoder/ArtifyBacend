// services/emailService.js
const nodemailer = require('nodemailer');
const path = require('path');
const ejs = require('ejs');
const fs = require('fs');

// Create transporter (configure with your email service)
const transporter = nodemailer.createTransport({
    host: process.env.EMAIL_HOST,
    port: process.env.EMAIL_PORT,
    secure: process.env.EMAIL_SECURE === 'true',
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASSWORD
  }
});

// Function to send welcome email
const sendWelcomeEmail = async (email) => {
  try {
    // Read the email template
    const templatePath = path.join(__dirname, '../templates/welcomeEmail.ejs');
    const template = fs.readFileSync(templatePath, 'utf-8');
    
    // Render the template with data
    const html = ejs.render(template, {
      email,
      currentYear: new Date().getFullYear()
    });

    // Send email
    await transporter.sendMail({
      from: `"Artify" <${process.env.EMAIL_FROM}>`,
      to: email,
      subject: 'Welcome to Our Newsletter!',
      html
    });

    console.log(`Welcome email sent to ${email}`);
  } catch (error) {
    console.error('Error sending welcome email:', error);
    throw error;
  }
};

module.exports = { sendWelcomeEmail };