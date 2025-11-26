import express from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import User from "../models/User.js";

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
  const { name, email, password } = req.body;

  try {
    const normalizedEmail = email.toLowerCase();
    const existingUser = await User.findOne({ email: normalizedEmail });

    if (existingUser) {
      return res.status(400).json({ error: "User already exists. Please sign in." });
    }

    const hashedPassword = await bcrypt.hash(password, 12);
    const newUser = await User.create({
      name,
      email: normalizedEmail,
      password: hashedPassword,
    });

    const token = generateToken(newUser);

    res.status(201).json({
      token,
      user: { id: newUser._id, name: newUser.name, email: newUser.email },
    });
  } catch (err) {
    console.error("Signup Error:", err);
    res.status(500).json({ error: "Server error during signup." });
  }
});

// 🔐 Login Route
router.post("/login", async (req, res) => {
  const { email, password } = req.body;
  console.log("Recieved body: ", {email, password});

  try {
    const normalizedEmail = email.toLowerCase();
    const user = await User.findOne({ email: normalizedEmail });
    console.log("User found:", user ? user.email : null);

    if (!user || !user.password) {
      return res.status(400).json({ error: "Invalid credentials." });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    console.log("Password match:", isMatch);
    if (!isMatch) {
      return res.status(400).json({ error: "Invalid credentials." });
    }

    const token = generateToken(user);

    res.status(200).json({
      token,
      user: { id: user._id, name: user.name, email: user.email },
    });
  } catch (err) {
    console.error("Login Error:", err);
    res.status(500).json({ error: "Server error during login." });
  }
});

export default router;