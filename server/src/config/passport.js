import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import User from '../models/User.js';

const clientID = process.env.GOOGLE_CLIENT_ID;
const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
const callbackURL = process.env.GOOGLE_CALLBACK_URL || 'http://localhost:5000/api/auth/google/callback';

passport.use(
  new GoogleStrategy(
    { clientID, clientSecret, callbackURL },
    async (accessToken, refreshToken, profile, done) => {
      try {
        const email = profile.emails?.[0]?.value?.toLowerCase();
        const googleId = profile.id;
        const name = profile.displayName || 'Unknown';
        const avatar_url = profile.photos?.[0]?.value;

        let user = await User.findOne({ $or: [{ googleId }, { email }] });
        if (!user) {
          user = await User.create({
            name,
            email,
            password: Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2), // placeholder (not used)
            username: profile.username || undefined,
            avatar_url,
            googleId,
          });
        } else {
          if (!user.googleId) {
            user.googleId = googleId;
            await user.save();
          }
        }
        return done(null, user);
      } catch (err) {
        return done(err, null);
      }
    }
  )
);