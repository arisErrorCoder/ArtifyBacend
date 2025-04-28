const nodemailer = require('nodemailer');
const adminTemplate = require('../templates/adminEmailTemplate');
const userTemplate = require('../templates/userEmailTemplate');

const transporter = nodemailer.createTransport({
    host: process.env.EMAIL_HOST,
    port: process.env.EMAIL_PORT,
    secure: process.env.EMAIL_SECURE === 'true',
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASSWORD
  }
});

const sendAdminNotification = async (name, email, phone, subject, message) => {
  const mailOptions = {
    from: process.env.EMAIL_USER,
    to: process.env.ADMIN_EMAIL,
    subject: `New Contact Form Submission: ${subject}`,
    html: adminTemplate(name, email, phone, subject, message)
  };

  await transporter.sendMail(mailOptions);
};

const sendUserConfirmation = async (name, email) => {
  const mailOptions = {
    from: process.env.EMAIL_USER,
    to: email,
    subject: 'Thank you for contacting us!',
    html: userTemplate(name)
  };

  await transporter.sendMail(mailOptions);
};

module.exports = {
  sendAdminNotification,
  sendUserConfirmation
};