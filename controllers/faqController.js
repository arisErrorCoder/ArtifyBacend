const nodemailer = require('nodemailer');

// Configure your email service
const transporter = nodemailer.createTransport({
    host: process.env.EMAIL_HOST,
    port: process.env.EMAIL_PORT,
    secure: process.env.EMAIL_SECURE === 'true',
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASSWORD
  }
});

exports.sendQuestion = async (req, res) => {
  try {
    const { question, email } = req.body;

    if (!question) {
      return res.status(400).json({ error: 'Question is required' });
    }

    // Email options
    const mailOptions = {
      from: process.env.EMAIL_USERNAME,
      to: process.env.ADMIN_EMAIL, // Your admin email address
      subject: 'New FAQ Question from Website',
      text: `New question received:\n\nQuestion: ${question}\n\nUser Email: ${email || 'Not provided'}`,
      html: `
      <div style="font-family: Arial, sans-serif; padding: 20px; background-color: #f9f9f9; color: #333;">
        <div style="max-width: 600px; margin: auto; background-color: #ffffff; border: 1px solid #ddd; border-radius: 8px; padding: 20px;">
          <h2 style="color: #2c3e50; font-size: 20px;">📩 New Question Received</h2>
          <p style="font-size: 16px; line-height: 1.5;"><strong>Question:</strong></p>
          <p style="background-color: #f1f1f1; padding: 10px; border-left: 4px solid #3498db; border-radius: 4px;">${question}</p>
          <p style="margin-top: 20px; font-size: 16px;"><strong>User Email:</strong> ${email || 'Not provided'}</p>
          <hr style="margin: 30px 0;">
          <p style="font-size: 14px; color: #888;">This message was generated from your website FAQ form.</p>
        </div>
      </div>
    `
    };

    // Send email
    await transporter.sendMail(mailOptions);

    res.status(200).json({ message: 'Question submitted successfully. We will get back to you soon!' });
  } catch (error) {
    console.error('Error sending question:', error);
    res.status(500).json({ error: 'Failed to submit question. Please try again later.' });
  }
};