import crypto from 'crypto';
import User from '../models/User.js';
import EmailVerification from '../models/EmailVerification.js';
import { sendEmailVerification } from '../../ForgotPassword/utils/emailService.js'; 
import errorMessages from '../../utils/errorMessages.js';

// Step 1: Request Verification PIN (send to user's email during signup)
const requestVerification = async (req, res) => {
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
      return res.status(400).json({
        success: false,
        message: "User not found"
      });
    }

    // 2. Check if user is already verified
    if (user.isVerified) {
      return res.status(400).json({
        success: false,
        message: "Email is already verified"
      });
    }

    // 3. Generate 6-digit PIN
    const pin = crypto.randomInt(100000, 999999).toString();
    const pinExpires = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes

    // 4. Delete any existing verification records for this email
    await EmailVerification.deleteMany({ email: email.toLowerCase() });

    // 5. Save PIN to EmailVerification collection
    await EmailVerification.create({
      email: email.toLowerCase(),
      pin: pin,
      pinExpires: pinExpires,
      attempts: 0
    });

    // 6. Send verification email
    const emailSent = await sendEmailVerification(email, pin);

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
    console.error('Request verification error:', error);
    res.status(500).json({
      success: false,
      message: errorMessages.SERVER_ERROR
    });
  }
};

// Step 2: Verify PIN (user enters pin)
const verifyEmail = async (req, res) => {
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

    // 1. Find the verification record
    const verificationRecord = await EmailVerification.findOne({
      email: email.toLowerCase()
    });

    if (!verificationRecord) {
      return res.status(400).json({
        success: false,
        message: errorMessages.NO_PIN_REQUESTED
      });
    }

    // 2. Check if PIN expired
    if (new Date() > verificationRecord.pinExpires) {
      await verificationRecord.deleteOne();
      return res.status(400).json({
        success: false,
        message: errorMessages.PIN_EXPIRED
      });
    }

    // 3. Check attempts
    if (verificationRecord.attempts >= 5) {
      return res.status(400).json({
        success: false,
        message: errorMessages.PIN_MAX_ATTEMPTS
      });
    }

    // 4. Verify PIN
    if (verificationRecord.pin !== pin) {
      verificationRecord.attempts += 1;
      await verificationRecord.save();

      const attemptsLeft = 5 - verificationRecord.attempts;
      return res.status(400).json({
        success: false,
        message: `${errorMessages.PIN_INVALID}. ${attemptsLeft} attempts left.`
      });
    }

    // 5. PIN is correct! Update user as verified
    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      return res.status(404).json({
        success: false,
        message: errorMessages.USER_NOT_FOUND
      });
    }

    user.isVerified = true;
    user.verificationToken = undefined;
    user.verificationExpires = undefined;
    await user.save();

    // 6. Delete the verification record
    await verificationRecord.deleteOne();

    res.json({
      success: true,
      message: "Email verified successfully"
    });

  } catch (error) {
    console.error('Verify email error:', error);
    res.status(500).json({
      success: false,
      message: errorMessages.SERVER_ERROR
    });
  }
};

// Resend verification PIN
const resendVerification = async (req, res) => {
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
      return res.status(400).json({
        success: false,
        message: "User not found"
      });
    }

    // Check if user is already verified
    if (user.isVerified) {
      return res.status(400).json({
        success: false,
        message: "Email is already verified"
      });
    }

    // Generate new PIN
    const pin = crypto.randomInt(100000, 999999).toString();
    const pinExpires = new Date(Date.now() + 15 * 60 * 1000);

    // Delete old and create new
    await EmailVerification.deleteMany({ email: email.toLowerCase() });

    await EmailVerification.create({
      email: email.toLowerCase(),
      pin: pin,
      pinExpires: pinExpires,
      attempts: 0
    });

    // Send verification email
    const emailSent = await sendEmailVerification(email, pin);

    if (!emailSent) {
      return res.status(500).json({
        success: false,
        message: errorMessages.EMAIL_SEND_FAILED
      });
    }

    res.json({
      success: true,
      message: 'Verification PIN sent to email'
    });

  } catch (error) {
    console.error('Resend verification error:', error);
    res.status(500).json({
      success: false,
      message: errorMessages.SERVER_ERROR
    });
  }
};

export {
  requestVerification,
  verifyEmail,
  resendVerification
};