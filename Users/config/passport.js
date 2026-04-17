import passport from "passport";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import User from "../models/User.js";

passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: process.env.GOOGLE_CALLBACK_URL,
    },
    async (accessToken, refreshToken, profile, done) => {
      try {
        console.log('===== GOOGLE PROFILE DEBUG =====');
        console.log('[Google OAuth] Full profile object:', JSON.stringify(profile, null, 2));
        console.log('[Google OAuth] Photos array:', profile.photos);
        console.log('[Google OAuth] Profile._json:', profile._json);
        console.log('[Google OAuth] Profile picture URLs found:');
        console.log('  - photos[0]?.value:', profile.photos?.[0]?.value);
        console.log('  - _json.picture:', profile._json?.picture);
        console.log('  - _json.image:', profile._json?.image);
        console.log('  - _json.photos:', profile._json?.photos);
        console.log('=================================');
        
        // Extract profile picture from multiple possible locations
        const profilePicture = 
          profile.photos?.[0]?.value || 
          profile._json?.picture || 
          profile._json?.image?.url ||
          profile._json?.photos?.[0]?.value ||
          null;

        console.log('[Google OAuth] Final extracted profile picture:', profilePicture);
        
        let user = await User.findOne({ googleId: profile.id });

        if (!user) {
          console.log('[Google OAuth] Creating new user...');
          console.log('  - Name:', profile.displayName);
          console.log('  - Email:', profile.emails?.[0]?.value);
          console.log('  - Profile Picture:', profilePicture);
          
          user = await User.create({
            googleId: profile.id,
            name: profile.displayName,
            email: profile.emails?.[0]?.value,
            profilePicture: profilePicture,
          });
          console.log('[Google OAuth] ✅ New user created with ID:', user._id);
          console.log('[Google OAuth] User profilePicture field:', user.profilePicture);
        } else {
          console.log('[Google OAuth] ⚡ Existing user found:', user._id);
          console.log('[Google OAuth] Current profilePicture:', user.profilePicture);
          console.log('[Google OAuth] New profilePicture from Google:', profilePicture);
          
          // Update existing user's profile picture if not set
          if (!user.profilePicture && profilePicture) {
            user.profilePicture = profilePicture;
            await user.save();
            console.log('[Google OAuth] ✅ Profile picture updated for existing user');
          }
        }

        // Attach tokens to user object for use in the callback
        user.accessToken = accessToken;
        user.refreshToken = refreshToken;

        return done(null, user);
      } catch (err) {
        console.error('[Google OAuth] ❌ Error:', err);
        return done(err, null);
      }
    }
  )
);

export default passport;
