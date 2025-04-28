const emailService = require('../services/contactemailService');

const handleContactForm = async (req, res) => {
  try {
    const { name, email, phone, subject, message } = req.body;

    // Validate input
    if (!name || !email || !subject || !message) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Send emails
    await emailService.sendAdminNotification(name, email, phone, subject, message);
    await emailService.sendUserConfirmation(name, email);

    res.status(200).json({ message: 'Message sent successfully' });
  } catch (error) {
    console.error('Error in contact form submission:', error);
    res.status(500).json({ error: 'Failed to send message' });
  }
};

module.exports = {
  handleContactForm
};