const nodemailer = require('nodemailer');

function createTransport() {
  return nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 587,
    secure: false,
    auth: {
      user: process.env.GMAIL_FROM,
      pass: process.env.GMAIL_APP_PASSWORD,
    },
  });
}

async function sendEmail(to, subject, body) {
  const transporter = createTransport();
  const info = await transporter.sendMail({
    from: process.env.GMAIL_FROM,
    to,
    subject,
    text: body,
  });
  return info.messageId;
}

module.exports = { sendEmail };
