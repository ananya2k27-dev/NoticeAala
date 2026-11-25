
const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_APP_PASSWORD,
  },
});

async function sendOTP(email, otp) {
  return transporter.sendMail({
    from: `"Campus Circular Agent" <${process.env.EMAIL_USER}>`,
    to: email,
    subject: "Your Campus Circular Agent verification code",
    text: `Your verification code is ${otp}. It expires in 5 minutes. Do not share it with anyone.`,
    html: `
      <div style="font-family:Arial,sans-serif;max-width:480px;margin:auto">
        <h2>Campus Circular Agent</h2>
        <p>Use the following code to verify your email:</p>
        <h1 style="letter-spacing:8px">${otp}</h1>
        <p>This code expires in 5 minutes.</p>
        <p>If you did not request this, ignore this email.</p>
      </div>
    `,
  });
}

module.exports = { sendOTP };