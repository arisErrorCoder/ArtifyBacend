module.exports = (name) => {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background-color: #2c3e50; color: white; padding: 20px; text-align: center; }
          .content { padding: 20px; background-color: #f9f9f9; }
          .footer { margin-top: 20px; padding: 10px; text-align: center; font-size: 12px; color: #777; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h2>Thank You for Contacting Us</h2>
          </div>
          <div class="content">
            <p>Dear ${name},</p>
            <p>We have received your message and appreciate you reaching out to us. Our team will review your inquiry and get back to you as soon as possible.</p>
            <p>Typically, we respond within 24-48 hours during business days.</p>
            <p>If your inquiry is urgent, please don't hesitate to call us at ${process.env.COMPANY_PHONE || 'our support number'}.</p>
            <p>Thank you for your patience!</p>
          </div>
          <div class="footer">
            <p>Best regards,</p>
            <p>The ${process.env.COMPANY_NAME || 'Our Company'} Team</p>
          </div>
        </div>
      </body>
      </html>
    `;
  };