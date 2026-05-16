import bcrypt from 'bcryptjs';
import User from '../models/auth.model.js';
import Counter from '../models/counter.model.js';
import {checkOtp, sendOtpSms, sendOtpEmail} from '../utils/otp.services.js';
import {createTokenAndSetCookie} from '../utils/token.utils.js';

const SALT_ROUNDS = 10;

const isEmail = s => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(s).trim());

/** Accepts 10-digit local or 12-digit with 91 prefix; returns E.164 +91… or null */
const normalizePhone = input => {
  const digits = String(input ?? '').replace(/\D/g, '');
  if (digits.length === 10) return `+91${digits}`;
  if (digits.length === 12 && digits.startsWith('91')) return `+${digits}`;
  return null;
};

const parseLoginIdentifier = raw => {
  const s = String(raw ?? '').trim();
  if (!s) return null;
  if (isEmail(s)) return {type: 'email', value: s.toLowerCase()};
  const phone = normalizePhone(s);
  if (phone) return {type: 'phone', value: phone};
  return null;
};

const toPlainUser = doc => {
  const o = doc.toObject ? doc.toObject() : {...doc};
  delete o.passwordHash;
  return o;
};

const getNextStaffId = async () => {
  const counter = await Counter.findOneAndUpdate(
    {key: 'm_staff_id'},
    {$inc: {value: 1}},
    {new: true, upsert: true, setDefaultsOnInsert: true},
  );
  return `STF${String(counter.value).padStart(6, '0')}`;
};

const healthCheck = async (req, res) => {
  try {
    res.status(200).json({
      success: true,
      message: 'Health check successful.',
    });
  } catch (error) {
    console.error('Health check error:', error);
    return res.status(500).json({
      success: false,
      message: 'Health check error.',
    });
  }
};

const logout = async (req, res) => {
  try {
    res.clearCookie('authToken', {
      httpOnly: true,
      secure: false,
      sameSite: 'lax',
    });
    return res.status(200).json({
      success: true,
      message: 'Logged out successfully.',
    });
  } catch (error) {
    console.error('logout error:', error);
    return res.status(500).json({
      success: false,
      message: 'Logout failed.',
    });
  }
};

/** Sign up: email, phone (10 digits or normalizable), password */
const register = async (req, res) => {
  try {
    const {fullName, email, phone, password} = req.body;

    if (!fullName || !email || !phone || !password) {
      return res.status(400).json({
        success: false,
        message: 'Name, email, phone number, and password are required.',
      });
    }

    if (password.length < 8) {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 8 characters.',
      });
    }

    const emailNorm = String(email).trim().toLowerCase();
    if (!isEmail(emailNorm)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid email address.',
      });
    }

    const phoneNorm = normalizePhone(phone);
    if (!phoneNorm) {
      return res.status(400).json({
        success: false,
        message: 'Invalid phone number. Use 10 digits.',
      });
    }

    const exists = await User.findOne({
      $or: [{email: emailNorm}, {phoneNumber: phoneNorm}],
    });
    if (exists) {
      return res.status(409).json({
        success: false,
        message: 'An account with this email or phone already exists.',
      });
    }

    const staffId = await getNextStaffId();
    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
    const user = await User.create({
      m_staff_id: staffId,
      fullName: String(fullName).trim(),
      email: emailNorm,
      phoneNumber: phoneNorm,
      passwordHash,
      role: 'user',
    });

    const token = createTokenAndSetCookie(res, {
      userId: user._id.toString(),
      phoneNumber: user.phoneNumber,
    });

    return res.status(201).json({
      success: true,
      message: 'Registration successful.',
      user: toPlainUser(user),
      token,
    });
  } catch (error) {
    console.error('Register error:', error);
    return res.status(500).json({
      success: false,
      message: 'Registration failed.',
    });
  }
};

/** Login: identifier (email or phone) + password */
const login = async (req, res) => {
  try {
    const {identifier, password} = req.body;

    if (!identifier || !password) {
      return res.status(400).json({
        success: false,
        message: 'Email or phone and password are required.',
      });
    }

    const parsed = parseLoginIdentifier(identifier);
    if (!parsed) {
      return res.status(400).json({
        success: false,
        message: 'Enter a valid email or 10-digit phone number.',
      });
    }

    const query =
      parsed.type === 'email'
        ? {email: parsed.value}
        : {phoneNumber: parsed.value};

    const user = await User.findOne(query)
      .select('+passwordHash')
      .populate('companies');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'No account found with these credentials.',
      });
    }

    const match = await bcrypt.compare(password, user.passwordHash);
    if (!match) {
      return res.status(401).json({
        success: false,
        message: 'Invalid password.',
      });
    }

    const token = createTokenAndSetCookie(res, {
      userId: user._id.toString(),
      phoneNumber: user.phoneNumber,
      name: user.fullName,
      email: user.email,
    });

    return res.status(200).json({
      success: true,
      message: 'Login successful.',
      user: toPlainUser(user),
      token,
    });
  } catch (error) {
    console.error('Login error:', error);
    return res.status(500).json({
      success: false,
      message: 'Login failed.',
    });
  }
};


const requestOtp = async (req, res) => {
  try {
    const {whatsappNumber, phoneNumber} = req.body;
    const raw = whatsappNumber ?? phoneNumber;
    if (!raw) {
      return res.status(400).json({
        success: false,
        message: 'Phone number is required.',
      });
    }
    await sendOtpSms(raw);

    res.status(200).json({
      message: 'OTP sent successfully.',
      success: true,
    });
  } catch (error) {
    console.error('requestOtp error:', error);
    return res.status(500).json({
      success: false,
      message: 'Could not send OTP.',
    });
  }
};

const verifyOtp = async (req, res) => {
  try {
    const {whatsappNumber, phoneNumber, otp} = req.body;
    const raw = whatsappNumber ?? phoneNumber;
    if (!raw || !otp) {
      return res.status(400).json({
        success: false,
        message: 'Phone number and OTP are required.',
      });
    }
    const isValid = checkOtp(raw, otp);
    if (!isValid) {
      return res.status(400).json({
        success: false,
        message: 'Invalid or expired OTP.',
      });
    }

    const normalized = normalizePhone(raw);
    if (!normalized) {
      return res.status(400).json({
        success: false,
        message: 'Invalid phone number.',
      });
    }

    const user = await User.findOne({phoneNumber: normalized}).populate('companies');
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found.',
      });
    }

    const token = createTokenAndSetCookie(res, {
      userId: user._id.toString(),
      phoneNumber: user.phoneNumber,
    });

    return res.status(200).json({
      success: true,
      message: 'OTP verified successfully.',
      token,
      user: toPlainUser(user),
    });
  } catch (error) {
    console.error('verifyOtp error:', error);
    return res.status(500).json({
      success: false,
      message: 'OTP verification failed.',
    });
  }
};

const updateUser = async (req, res) => {
  try {
    const { mobile } = req.params;
    const updateData = req.body;

    // Prevent sensible fields from being manually updated
    delete updateData.passwordHash;
    delete updateData.m_staff_id;

    if (updateData.email) updateData.email = String(updateData.email).trim().toLowerCase();
    
    if (updateData.mobile) {
      const phoneNorm = normalizePhone(updateData.mobile);
      if (phoneNorm) updateData.phoneNumber = phoneNorm;
      delete updateData.mobile;
    }

    const norm = normalizePhone(mobile);
    if (!norm) {
      return res.status(400).json({
        success: false,
        message: 'Invalid mobile number format.',
      });
    }

    const user = await User.findOneAndUpdate(
      { email: updateData.email, phoneNumber: norm },
      { $set: updateData },
      { new: true, runValidators: true }
    );

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found.',
      });
    }

    return res.status(200).json({
      success: true,
      message: 'User updated successfully.',
      user: toPlainUser(user),
    });
  } catch (error) {
    console.error('Update user error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to update user.',
    });
  }
};



const requestEmailOtp = async (req, res) => {
  try {
    const { email } = req.body;
    if (!email || !isEmail(email)) {
      return res.status(400).json({
        success: false,
        message: 'Valid email address is required.',
      });
    }

    const user = await User.findOne({ email: String(email).trim().toLowerCase() });
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'No account found with this email.',
      });
    }

    await sendOtpEmail(email);

    res.status(200).json({
      message: 'OTP sent to email successfully.',
      success: true,
    });
  } catch (error) {
    console.error('requestEmailOtp error:', error);
    return res.status(500).json({
      success: false,
      message: 'Could not send OTP to email.',
    });
  }
};

const forgotPassword = async (req, res) => {
  try {
    const { identifier, email, phone, phoneNumber, otp, newPassword } = req.body;
    
    const target = identifier || email || phone || phoneNumber;

    if (!target || !otp || !newPassword) {
      return res.status(400).json({
        success: false,
        message: 'Please provide email/phone, OTP, and newPassword.',
      });
    }

    // Verify OTP
    const isValidOtp = checkOtp(target, otp);
    if (!isValidOtp) {
      return res.status(400).json({
        success: false,
        message: 'Invalid or expired OTP.',
      });
    }

    // Check if target is email or phone
    const query = target.includes('@')
      ? { email: target.toLowerCase() }
      : { phoneNumber: normalizePhone(target) };

    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Update user password
    const user = await User.findOneAndUpdate(
      query,
      { $set: { passwordHash: hashedPassword } },
      { new: true }
    );

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found.',
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Password updated successfully.',
      user: toPlainUser(user),
    });

  } catch (error) {
    console.error('Forgot password error:', error);

    return res.status(500).json({
      success: false,
      message: 'Failed to reset password.',
    });
  }
};

export {healthCheck, register, login, logout, requestOtp, requestEmailOtp, verifyOtp, updateUser, forgotPassword};
