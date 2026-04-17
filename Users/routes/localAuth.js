import express from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import crypto from 'crypto';
import User from "../models/User.js";
import EmailVerification from "../models/EmailVerification.js";
import { sendEmailVerification } from '../../ForgotPassword/utils/emailService.js';
import errorMessages from "../../utils/errorMessages.js";
import { requestVerification, verifyEmail, resendVerification } from '../controllers/emailVerificationController.js';

const router = express.Router();

// 🔐 Utility: Generate JWT
const generateToken = (user) => {
  return jwt.sign(
    { id: user._id, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: "1d" }
  );
};

// 📝 Signup Route
router.post("/signup", async (req, res) => {
  const { name, email, password, role } = req.body || {}; // include role, guard against undefined

  // Validate required fields
  if (!email || !password) {
    return res.status(400).json({ error: "Email and password are required." });
  }

  // Validate email format - strict validation
  const emailRegex = /^[a-zA-Z0-9](?:[a-zA-Z0-9._-]*[a-zA-Z0-9])?@[a-zA-Z0-9](?:[a-zA-Z0-9-]*[a-zA-Z0-9])?(?:\.[a-zA-Z]{2,})+$/;
  if (!emailRegex.test(email)) {
    return res.status(400).json({ error: "Please provide a valid email address." });
  }

  // Additional check: ensure domain has a proper TLD (block @gmail,com, @gmail.co, etc.)
  const emailParts = email.split('@');
  if (emailParts.length !== 2) {
    return res.status(400).json({ error: "Please provide a valid email address." });
  }
  
  const domain = emailParts[1];
  const domainParts = domain.split('.');
  
  // Domain must have at least one dot and valid TLD
  if (domainParts.length < 2) {
    return res.status(400).json({ error: "Email domain must be complete (e.g., gmail.com)." });
  }
  
  // Check that all domain parts are valid (no commas, proper format)
  const validDomainPart = /^[a-zA-Z0-9]+$/;
  if (!domainParts.every(part => validDomainPart.test(part))) {
    return res.status(400).json({ error: "Email domain contains invalid characters." });
  }
  
  // TLD must be at least 2 characters (blocks .co but allows .com, .org, etc.)
  const tld = domainParts[domainParts.length - 1];
  if (tld.length < 3 || !validDomainPart.test(tld)) {
    return res.status(400).json({ error: "Email domain must be complete (e.g., gmail.com)." });
  }

  // Validate name
  if (!name || typeof name !== 'string' || name.trim().length === 0) {
    return res.status(400).json({ error: "Name is required and cannot be empty." });
  }

  // Validate password strength
  if (typeof password !== 'string' || password.length < 6) {
    return res.status(400).json({ error: "Password must be at least 6 characters long." });
  }

  // Check for at least one number and one letter
  const hasNumber = /\d/.test(password);
  const hasLetter = /[a-zA-Z]/.test(password);
  if (!hasNumber || !hasLetter) {
    return res.status(400).json({ error: "Password must contain at least one letter and one number." });
  }

  // Validate name length
  if (name.trim().length < 2 || name.trim().length > 50) {
    return res.status(400).json({ error: "Name must be between 2 and 50 characters." });
  }

  try {
    console.log("Signup attempt with email:", email);
    const normalizedEmail = email.toLowerCase();
    const trimmedName = name.trim();
    
    // Check if user already exists
    const existingUser = await User.findOne({ email: normalizedEmail });
    console.log("Existing user check result:", existingUser ? `User found: ${existingUser.email}` : "No user found - email is available");

    if (existingUser) {
      console.log("User already exists with email:", normalizedEmail);
      return res.status(400).json({ error: "User already exists. Please sign in." });
    }

    const hashedPassword = await bcrypt.hash(password, 12);

    let newUser;
    try {
      newUser = await User.create({
        name: trimmedName,
        email: normalizedEmail,
        password: hashedPassword,
        role: role || "user",
        isVerified: false,
      });
    } catch (dbError) {
      // Handle MongoDB duplicate key error specifically
      if (dbError.code === 11000) {
        console.error("Duplicate key error for email:", normalizedEmail);
        return res.status(400).json({ error: "User already exists. Please sign in." });
      }
      // Re-throw other database errors
      throw dbError;
    }

    // Automatically send verification email after registration
    try {
      // Generate 6-digit PIN
      const pin = crypto.randomInt(100000, 999999).toString();
      const pinExpires = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes

      // Delete any existing verification records for this email
      await EmailVerification.deleteMany({ email: normalizedEmail });

      // Save PIN to EmailVerification collection
      await EmailVerification.create({
        email: normalizedEmail,
        pin: pin,
        pinExpires: pinExpires,
        attempts: 0
      });

      // Send verification email
      const emailSent = await sendEmailVerification(normalizedEmail, pin);

      if (!emailSent) {
        console.error('Failed to send verification email to:', normalizedEmail);
      }
    } catch (emailErr) {
      console.error('Error sending verification email:', emailErr);
      // Don't fail the registration if email sending fails
    }

    res.status(201).json({
      success: true,
      message: "Registration successful. Please check your email for verification.",
      user: {
        id: newUser._id,
        name: newUser.name,
        email: newUser.email,
        role: newUser.role,
      },
    });
  } catch (err) {
    console.error("Signup Error:", err);
    res.status(500).json({ error: "Server error during signup." });
  }
});

// 🔐 Login Route
router.post("/login", async (req, res) => {
  const { email, password } = req.body || {};
  console.log("Received login body:", { email, password: !!password });

  if (!email || !password) {
    return res.status(400).json({ error: "Email and password are required." });
  }

  try {
    const normalizedEmail = email.toLowerCase();
    console.log("Searching user with:", normalizedEmail);
    const user = await User.findOne({ email: normalizedEmail });
    console.log("User found:", user ? user.email : null);

    if (!user ) {
      return res.status(400).json({ error: "User does not exist" });
    }

    // Check if user is verified (for new accounts)
    if (user.isVerified === false) {
      return res.status(400).json({ error: errorMessages.EMAIL_NOT_VERIFIED });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    console.log("Password match:", isMatch);
    if (!isMatch) {
      return res.status(400).json({ error: "Invalid credentials." });
    }

    const token = generateToken(user);

    res.status(200).json({
      token,
      user: {
        id: user._id,
        userId: user.userId,
        name: user.name,
        email: user.email,
        role: user.role
      },
    });
  } catch (err) {
    console.error("Login Error:", err);
    res.status(500).json({ error: "Server error during login." });
  }
});

// Email verification routes
router.post('/request-verification', requestVerification);
router.post('/verify-email', verifyEmail);
router.post('/resend-verification', resendVerification);

export default router;