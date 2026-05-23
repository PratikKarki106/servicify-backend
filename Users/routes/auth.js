import express from "express";
import passport from "passport";
import jwt from "jsonwebtoken";

const router = express.Router();

router.get("/google", passport.authenticate("google", { scope: ["profile", "email"] }));

router.get(
  "/google/callback",
  passport.authenticate("google", { session: false }),
  (req, res) => {
    console.log('[Google OAuth Callback] User authenticated:', req.user);
    
    const token = jwt.sign({ id: req.user._id }, process.env.JWT_SECRET, { expiresIn: "1d" });

    // Include user data in redirect
    const userData = {
      _id: req.user._id,
      userId: req.user.userId,
      name: req.user.name,
      email: req.user.email,
      profilePicture: req.user.profilePicture,
      role: req.user.role,
    };

    console.log('[Google OAuth Callback] User data being sent:', userData);

    // Encode user data as base64 to pass through URL
    const userDataEncoded = Buffer.from(JSON.stringify(userData)).toString('base64');

    // Redirect to frontend OAuth callback handler
    const redirectUrl = `${process.env.CLIENT_URL}/auth/callback?token=${token}&user=${userDataEncoded}`;
    console.log('[Google OAuth Callback] Redirecting to:', redirectUrl);
    res.redirect(redirectUrl);
  }
);

export default router;
