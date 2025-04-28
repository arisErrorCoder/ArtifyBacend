module.exports = (name, email, phone, subject, message) => {
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
          .details { margin: 15px 0; }
          .label { font-weight: bold; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h2>New Contact Form Submission</h2>
          </div>
          <div class="content">
            <p>You have received a new message from your website contact form:</p>
            
            <div class="details">
              <p><span class="label">Name:</span> ${name}</p>
              <p><span class="label">Email:</span> ${email}</p>
              ${phone ? `<p><span class="label">Phone:</span> ${phone}</p>` : ''}
              <p><span class="label">Subject:</span> ${subject}</p>
            </div>
            
            <div class="message">
              <p><span class="label">Message:</span></p>
              <p>${message.replace(/\n/g, '<br>')}</p>
            </div>
          </div>
          <div class="footer">
            <p>This is an automated message. Please do not reply directly to this email.</p>
          </div>
        </div>
      </body>
      </html>
    `;
  };