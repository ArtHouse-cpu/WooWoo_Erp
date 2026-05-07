import twilio from 'twilio';
import dotenv from 'dotenv';

dotenv.config();

const client = twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN,
);

let otpStore = {};

const generateOtp = () => Math.floor(1000 + Math.random() * 9000).toString();

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

const checkOtp = (mobileNumber, otp) => {
  const formatted = formatPhone(mobileNumber);
  const record = otpStore[formatted];
  if (!record) return false;
  if (record.expiresAt < Date.now()) return false;
  if (record.otp !== otp) return false;

  delete otpStore[formatted];
  return true;
};

export {sendOtpSms, checkOtp};
