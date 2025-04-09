// routes/careerRoutes.js
const express = require('express');
const router = express.Router();
const nodemailer = require('nodemailer');
const multer = require('multer');
const path = require('path');

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/resumes/');
  },
  filename: (req, file, cb) => {
    cb(null, `${Date.now()}-${file.originalname}`);
  }
});

const upload = multer({ 
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: (req, file, cb) => {
    const filetypes = /pdf|doc|docx/;
    const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = filetypes.test(file.mimetype);
    
    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb('Error: Only PDF, DOC, and DOCX files are allowed!');
    }
  }
});

// Submit application
router.post('/apply', upload.single('resume'), async (req, res) => {
  try {
    const { name, email, phone, position, message, linkedin, github } = req.body;
    const resume = req.file;

    // Validate required fields
    if (!name || !email || !position) {
      return res.status(400).json({ error: 'Name, email, and position are required' });
    }

    // Create email transporter
    const transporter = nodemailer.createTransport({
      host: process.env.EMAIL_HOST,
      port: process.env.EMAIL_PORT,
      secure: process.env.EMAIL_SECURE === 'true',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASSWORD
      }
    });

    // Email to company
    const companyMailOptions = {
      from: `"Career Portal" <${process.env.EMAIL_FROM}>`,
      to: process.env.ADMIN_EMAIL,
      subject: `New Job Application: ${position}`,
      html: generateApplicationEmail(req.body, resume),
      attachments: resume ? [{
        filename: resume.originalname,
        path: resume.path
      }] : []
    };

    // Email to applicant
    const applicantMailOptions = {
      from: `"Hiring Team" <${process.env.EMAIL_FROM}>`,
      to: email,
      subject: `Application Received: ${position}`,
      html: generateConfirmationEmail(req.body)
    };

    // Send both emails
    await transporter.sendMail(companyMailOptions);
    await transporter.sendMail(applicantMailOptions);

    res.status(200).json({ success: true, message: 'Application submitted successfully' });
  } catch (error) {
    console.error('Application error:', error);
    res.status(500).json({ error: 'Error submitting application' });
  }
});

// Email template generators
function generateApplicationEmail(data, resume) {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background-color: #4a6baf; padding: 20px; color: white; text-align: center; }
        .content { padding: 20px; background-color: #f9f9f9; }
        .section { margin-bottom: 20px; }
        .label { font-weight: bold; color: #4a6baf; }
        .footer { margin-top: 20px; font-size: 12px; text-align: center; color: #777; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>New Job Application</h1>
          <h2>${data.position}</h2>
        </div>
        <div class="content">
          <div class="section">
            <span class="label">Applicant:</span> ${data.name}
          </div>
          <div class="section">
            <span class="label">Email:</span> ${data.email}
          </div>
          <div class="section">
            <span class="label">Phone:</span> ${data.phone || 'Not provided'}
          </div>
          ${data.linkedin ? `<div class="section"><span class="label">LinkedIn:</span> <a href="${data.linkedin}">${data.linkedin}</a></div>` : ''}
          ${data.github ? `<div class="section"><span class="label">GitHub:</span> <a href="${data.github}">${data.github}</a></div>` : ''}
          <div class="section">
            <span class="label">Cover Letter:</span>
            <p>${data.message || 'No cover letter provided'}</p>
          </div>
          ${resume ? `<div class="section"><span class="label">Resume:</span> Attached (${resume.originalname})</div>` : ''}
        </div>
        <div class="footer">
          <p>This application was submitted through the careers portal.</p>
        </div>
      </div>
    </body>
    </html>
  `;
}

function generateConfirmationEmail(data) {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background-color: #4a6baf; padding: 20px; color: white; text-align: center; }
        .content { padding: 20px; background-color: #f9f9f9; }
        .button { 
          display: inline-block; padding: 10px 20px; background-color: #4a6baf; 
          color: white; text-decoration: none; border-radius: 4px; margin: 20px 0;
        }
        .footer { margin-top: 20px; font-size: 12px; text-align: center; color: #777; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>Thank You for Your Application</h1>
        </div>
        <div class="content">
          <p>Dear ${data.name},</p>
          <p>We've received your application for the <strong>${data.position}</strong> position and appreciate your interest in joining our team.</p>
          <p>Our hiring team will review your application and get back to you within 5-7 business days. If your qualifications match our needs, we'll contact you to schedule an interview.</p>
          <p>In the meantime, feel free to explore more about our company:</p>
          <a href="https://yourcompany.com/about" class="button">Learn About Our Culture</a>
          <p>If you have any questions, don't hesitate to reply to this email.</p>
          <p>Best regards,<br>The Hiring Team</p>
        </div>
        <div class="footer">
          <p>© ${new Date().getFullYear()} Your Company. All rights reserved.</p>
        </div>
      </div>
    </body>
    </html>
  `;
}

module.exports = router;