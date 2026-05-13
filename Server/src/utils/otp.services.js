import twilio from 'twilio';
import nodemailer from 'nodemailer';
import dotenv from 'dotenv';

dotenv.config();

const client = twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN,
);

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp-relay.brevo.com',
  port: parseInt(process.env.SMTP_PORT) || 587,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

let otpStore = {};

const generateOtp = () => Math.floor(100000 + Math.random() * 900000).toString().substring(0, 6);

const formatPhone = number => {
  number = number.toString().trim();

  // Already in correct format
  if (number.startsWith('+91')) return number;

  // Remove any spaces, dashes, etc.
  number = number.replace(/\D/g, '');

  // Add +91
  return `+91${number}`;
};

const sendOtpSms = async mobileNumber => {
  const formattedNumber = formatPhone(mobileNumber);
  const otp = generateOtp();
  otpStore[formattedNumber] = {otp, expiresAt: Date.now() + 5 * 60 * 1000};

  return client.messages.create({
    body: `Your OTP is ${otp}. Valid for 5 minutes.`,
    from: process.env.TWILIO_PHONE_NUMBER,
    to: formattedNumber,
  });
};

const sendOtpEmail = async email => {
  const normalizedEmail = String(email).trim().toLowerCase();
  const otp = generateOtp();
  otpStore[normalizedEmail] = {otp, expiresAt: Date.now() + 5 * 60 * 1000};

  const mailOptions = {
    from: `"${process.env.SENDER_NAME}" <${process.env.SENDER_EMAIL}>`,
    to: normalizedEmail,
    subject: 'Your Password Reset OTP',
    text: `Your OTP for password reset is: ${otp}. It is valid for 5 minutes.`,
    html: `<p>Your OTP for password reset is: <strong>${otp}</strong>.</p><p>It is valid for 5 minutes.</p>`,
  };

  return transporter.sendMail(mailOptions);
};

const checkOtp = (identifier, otp) => {
  // If it contains '@', it's an email, else format as phone
  const formatted = identifier.includes('@')
    ? String(identifier).trim().toLowerCase()
    : formatPhone(identifier);
    
  const record = otpStore[formatted];
  if (!record) return false;
  if (record.expiresAt < Date.now()) return false;
  if (record.otp !== otp) return false;

  delete otpStore[formatted];
  return true;
};

export {sendOtpSms, sendOtpEmail, checkOtp};
