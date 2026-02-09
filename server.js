require('dotenv').config();
const express = require('express');
const nodemailer = require('nodemailer');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static('public'));

// Path to responses log file
const responsesFile = path.join(__dirname, 'responses.json');

// Initialize responses file if it doesn't exist
if (!fs.existsSync(responsesFile)) {
  fs.writeFileSync(responsesFile, JSON.stringify([], null, 2));
}

// Email transporter configuration
const createTransporter = () => {
  return nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS
    }
  });
};

// Log response to file
const logResponse = (data) => {
  try {
    const responses = JSON.parse(fs.readFileSync(responsesFile, 'utf8'));
    responses.push({
      ...data,
      timestamp: new Date().toISOString()
    });
    fs.writeFileSync(responsesFile, JSON.stringify(responses, null, 2));
    console.log('Response logged:', data);
  } catch (error) {
    console.error('Error logging response:', error);
  }
};

// Send email notification
const sendEmailNotification = async (data) => {
  const { name, phone, attending } = data;
  
  const attendingText = attending === 'yes' 
    ? '✅ Will Attend / سيحضر' 
    : '❌ Cannot Attend / لن يحضر';

  const mailOptions = {
    from: process.env.EMAIL_USER,
    to: 'motasem.aljayyousi@gmail.com',
    subject: `Wedding RSVP - ${name} - ${attending === 'yes' ? 'Attending' : 'Not Attending'}`,
    html: `
      <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background: linear-gradient(135deg, #f5f7fa 0%, #e4e8eb 100%); border-radius: 10px;">
        <div style="text-align: center; padding: 20px; background: linear-gradient(135deg, #2c5530 0%, #1a3d1f 100%); border-radius: 10px 10px 0 0;">
          <h1 style="color: #d4af37; margin: 0; font-size: 24px;">💍 Wedding RSVP Response</h1>
          <p style="color: #fff; margin: 10px 0 0 0;">Motasem & Dania - March 28, 2026</p>
        </div>
        
        <div style="background: #fff; padding: 30px; border-radius: 0 0 10px 10px;">
          <h2 style="color: #2c5530; border-bottom: 2px solid #d4af37; padding-bottom: 10px;">Guest Information</h2>
          
          <table style="width: 100%; border-collapse: collapse;">
            <tr>
              <td style="padding: 10px 0; color: #666; font-weight: bold;">Name / الاسم:</td>
              <td style="padding: 10px 0; color: #333;">${name}</td>
            </tr>
            <tr>
              <td style="padding: 10px 0; color: #666; font-weight: bold;">Phone / الهاتف:</td>
              <td style="padding: 10px 0; color: #333;">${phone}</td>
            </tr>
            <tr>
              <td style="padding: 10px 0; color: #666; font-weight: bold;">Response / الرد:</td>
              <td style="padding: 10px 0; color: #333; font-size: 18px;">${attendingText}</td>
            </tr>
            <tr>
              <td style="padding: 10px 0; color: #666; font-weight: bold;">Submitted / تاريخ الإرسال:</td>
              <td style="padding: 10px 0; color: #333;">${new Date().toLocaleString('en-US', { timeZone: 'Asia/Amman' })}</td>
            </tr>
          </table>
          
          <div style="margin-top: 20px; padding: 15px; background: #f8f9fa; border-radius: 8px; text-align: center;">
            <p style="margin: 0; color: #666; font-size: 14px;">
              بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ
            </p>
          </div>
        </div>
      </div>
    `
  };

  try {
    const transporter = createTransporter();
    await transporter.sendMail(mailOptions);
    console.log('Email sent successfully');
    return true;
  } catch (error) {
    console.error('Error sending email:', error);
    return false;
  }
};

// RSVP submission endpoint
app.post('/api/rsvp', async (req, res) => {
  const { name, phone, attending } = req.body;

  // Validate input
  if (!name || !phone || !attending) {
    return res.status(400).json({ 
      success: false, 
      message: 'Please fill in all fields / يرجى ملء جميع الحقول' 
    });
  }

  const responseData = { name, phone, attending };

  // Log the response
  logResponse(responseData);

  // Send email notification
  const emailSent = await sendEmailNotification(responseData);

  res.json({ 
    success: true, 
    message: attending === 'yes' 
      ? 'Thank you! We look forward to celebrating with you! / شكراً لك! نتطلع للاحتفال معك!' 
      : 'Thank you for letting us know. We will miss you! / شكراً لإعلامنا. سنفتقدك!',
    emailSent
  });
});

// Get all responses (for admin purposes)
app.get('/api/responses', (req, res) => {
  try {
    const responses = JSON.parse(fs.readFileSync(responsesFile, 'utf8'));
    res.json(responses);
  } catch (error) {
    res.status(500).json({ error: 'Error reading responses' });
  }
});

// Serve the main page
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`🎊 Wedding RSVP server running on port ${PORT}`);
  console.log(`📧 Emails will be sent to: motasem.aljayyousi@gmail.com`);
});
