import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import PasswordReset from '../model/PasswordReset.js';
import User from '../../Users/models/User.js';
import { sendPasswordResetEmail } from '../utils/emailService.js';
import errorMessages from '../../utils/errorMessages.js';

// Step 1: Request PIN (user enters email)
const requestPin = async (req, res) => {
  try {
    const { email } = req.body;

    // Validate email
    if (!email) {
      return res.status(400).json({
        success: false,
        message: errorMessages.EMAIL_REQUIRED
      });
    }

    // 1. Check if user exists
    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      // Don't reveal user doesn't exist (security)
      return res.json({ 
        success: true, 
        message: errorMessages.EMAIL_NOT_REGISTERED
      });
    }

    // 2. Generate 6-digit PIN
    const pin = crypto.randomInt(100000, 999999).toString();
    const pinExpires = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes

    // 3. Delete any existing PIN for this email
    await PasswordReset.deleteMany({ email: email.toLowerCase() });

    // 4. Save PIN to PasswordReset collection
    await PasswordReset.create({
      email: email.toLowerCase(),
      pin: pin,
      pinExpires: pinExpires,
      attempts: 0
    });

    // 5. Send email
    const emailSent = await sendPasswordResetEmail(email, pin);
    
    if (!emailSent) {
      return res.status(500).json({
        success: false,
        message: errorMessages.EMAIL_SEND_FAILED
      });
    }

    res.json({
      success: true,
      message: errorMessages.PIN_SENT
    });

  } catch (error) {
    console.error('Request PIN error:', error);
    res.status(500).json({
      success: false,
      message: errorMessages.SERVER_ERROR
    });
  }
};

// Step 2: Verify PIN (user enters pin)
const verifyPin = async (req, res) => {
  try {
    const { email, pin } = req.body;

    // Validate inputs
    if (!email) {
      return res.status(400).json({
        success: false,
        message: errorMessages.EMAIL_REQUIRED
      });
    }

    if (!pin) {
      return res.status(400).json({
        success: false,
        message: errorMessages.PIN_REQUIRED
      });
    }

    // 1. Find the PIN record
    const resetRecord = await PasswordReset.findOne({ 
      email: email.toLowerCase() 
    });

    if (!resetRecord) {
      return res.status(400).json({
        success: false,
        message: errorMessages.NO_PIN_REQUESTED
      });
    }

    // 2. Check if PIN already has a reset token (already verified)
    if (resetRecord.resetToken) {
      return res.status(400).json({
        success: false,
        message: errorMessages.PIN_ALREADY_VERIFIED
      });
    }

    // 3. Check if PIN expired
    if (new Date() > resetRecord.pinExpires) {
      await resetRecord.deleteOne();
      return res.status(400).json({
        success: false,
        message: errorMessages.PIN_EXPIRED
      });
    }

    // 4. Check attempts
    if (resetRecord.attempts >= 5) {
      return res.status(400).json({
        success: false,
        message: errorMessages.PIN_MAX_ATTEMPTS
      });
    }

    // 5. Verify PIN
    if (resetRecord.pin !== pin) {
      resetRecord.attempts += 1;
      await resetRecord.save();
      
      const attemptsLeft = 5 - resetRecord.attempts;
      return res.status(400).json({
        success: false,
        message: `${errorMessages.PIN_INVALID}. ${attemptsLeft} attempts left.`
      });
    }

    // 6. PIN is correct! Generate reset token
    const resetToken = crypto.randomBytes(32).toString('hex');
    const tokenExpires = new Date(Date.now() + 30 * 60 * 1000); // 30 minutes

    // Update record with token - DON'T set pin to undefined
    resetRecord.resetToken = resetToken;
    resetRecord.tokenExpires = tokenExpires;
    resetRecord.attempts = 0; // Reset attempts on success
    
    // Optional: Mark PIN as used or leave it as is
    // resetRecord.pin = ""; // Set to empty string if needed
    // resetRecord.pinUsed = true; // Or add a new field
    
    await resetRecord.save();

    res.json({
      success: true,
      message: errorMessages.PIN_VERIFIED || 'PIN verified successfully',
      resetToken: resetToken
    });

  } catch (error) {
    console.error('Verify PIN error:', error);
    res.status(500).json({
      success: false,
      message: errorMessages.SERVER_ERROR
    });
  }
};

// Step 3: Reset Password (user enters newPassword)
const resetPassword = async (req, res) => {
  try {
    const { email, resetToken, newPassword } = req.body;

    // Validate inputs
    if (!email) {
      return res.status(400).json({
        success: false,
        message: errorMessages.EMAIL_REQUIRED
      });
    }

    if (!resetToken) {
      return res.status(400).json({
        success: false,
        message: errorMessages.RESET_TOKEN_REQUIRED
      });
    }

    if (!newPassword) {
      return res.status(400).json({
        success: false,
        message: errorMessages.NEW_PASSWORD_REQUIRED
      });
    }

    // Additional password validation
    if (newPassword.length < 8) {
      return res.status(400).json({
        success: false,
        message: errorMessages.PASSWORD_TOO_SHORT
      });
    }

    // 1. Find reset record with valid token
    const resetRecord = await PasswordReset.findOne({
      email: email.toLowerCase(),
      resetToken: resetToken,
      tokenExpires: { $gt: new Date() }
    });

    if (!resetRecord) {
      return res.status(400).json({
        success: false,
        message: errorMessages.RESET_TOKEN_INVALID
      });
    }

    // 2. Find user
    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      return res.status(404).json({
        success: false,
        message: errorMessages.USER_NOT_FOUND
      });
    }

    // 3. Check if new password is same as old
    const isSamePassword = await bcrypt.compare(newPassword, user.password);
    if (isSamePassword) {
      return res.status(400).json({
        success: false,
        message: errorMessages.PASSWORD_SAME_AS_OLD
      });
    }

    // 4. Hash and update password
    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(newPassword, salt);
    await user.save();

    // 5. Delete reset record
    await resetRecord.deleteOne();

    res.json({
      success: true,
      message: errorMessages.PASSWORD_RESET_SUCCESS
    });

  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({
      success: false,
      message: errorMessages.SERVER_ERROR
    });
  }
};

// Optional: Resend PIN
const resendPin = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: errorMessages.EMAIL_REQUIRED
      });
    }

    // Check if user exists
    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      return res.json({ 
        success: true, 
        message: errorMessages.EMAIL_NOT_REGISTERED
      });
    }

    // Check rate limiting (you might want to add this logic)
    // const recentRequest = await PasswordReset.findOne({
    //   email: email.toLowerCase(),
    //   createdAt: { $gt: new Date(Date.now() - 1 * 60 * 1000) } // Last 1 minute
    // });
    
    // if (recentRequest) {
    //   return res.status(429).json({
    //     success: false,
    //     message: errorMessages.PIN_RESEND_LIMIT
    //   });
    // }

    // Generate new PIN
    const pin = crypto.randomInt(100000, 999999).toString();
    const pinExpires = new Date(Date.now() + 15 * 60 * 1000);

    // Delete old and create new
    await PasswordReset.deleteMany({ email: email.toLowerCase() });
    
    await PasswordReset.create({
      email: email.toLowerCase(),
      pin: pin,
      pinExpires: pinExpires,
      attempts: 0
    });

    // Send email
    const emailSent = await sendPasswordResetEmail(email, pin);
    
    if (!emailSent) {
      return res.status(500).json({
        success: false,
        message: errorMessages.EMAIL_SEND_FAILED
      });
    }

    res.json({
      success: true,
      message: 'PIN sent to email' // Or create PIN_RESEND_SUCCESS in errorMessages
    });

  } catch (error) {
    console.error('Resend PIN error:', error);
    res.status(500).json({
      success: false,
      message: errorMessages.SERVER_ERROR
    });
  }
};

export {
  requestPin,
  verifyPin,
  resetPassword,
  resendPin 
};