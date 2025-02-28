const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

const sendEmergencyEmail = async (to, subject, text) => {
  try {
    await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to,
      subject,
      text,
      html: `
        <div style="padding: 20px; background-color: #f8f8f8; border-radius: 10px;">
          <h2 style="color: ${subject.includes('EMERGENCY') ? '#ff0000' : '#000000'}">
            ${subject}
          </h2>
          <p style="font-size: 16px; line-height: 1.5;">${text}</p>
          ${subject.includes('EMERGENCY') ? 
            '<p style="color: #ff0000; font-weight: bold;">Please take immediate action!</p>' : 
            ''
          }
        </div>
      `
    });
    return true;
  } catch (error) {
    console.error('Email sending failed:', error);
    return false;
  }
};

module.exports = { sendEmergencyEmail };