import express from "express";
import passport from "passport";
import jwt from "jsonwebtoken";

const router = express.Router();

router.get("/google", passport.authenticate("google", { scope: ["profile", "email"] }));

router.get(
  "/google/callback",
  passport.authenticate("google", { session: false }),
  (req, res) => {
    const token = jwt.sign({ id: req.user._id }, process.env.JWT_SECRET, { expiresIn: "1d" });

    // Redirect to frontend with token
    const redirectUrl = `${process.env.FRONTEND_REDIRECT_URL}?token=${token}`;
    res.redirect(redirectUrl);
  }
);

export default router;
