
import "dotenv/config";

import passport from "passport";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import User from "../models/User.js";

const clientID = process.env.GOOGLE_CLIENT_ID;
const clientSecret = process.env.GOOGLE_CLIENT_SECRET;

if (!clientID || !clientSecret) {
  throw new Error(
    "GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET must be configured. Check your server/.env file."
  );
}

passport.use(
  new GoogleStrategy(
    {
      clientID,
      clientSecret,
      callbackURL:
        process.env.GOOGLE_CALLBACK_URL ||
        "http://localhost:5000/api/auth/google/callback",
    },
    async (_accessToken, _refreshToken, profile, done) => {
      try {
        const email = profile.emails?.[0]?.value
          ?.trim()
          .toLowerCase();

        const googleData = profile._json as {
          email_verified?: boolean;
        };

        if (!email || googleData.email_verified !== true) {
          return done(
            new Error("Google account email is not verified."),
            false
          );
        }

        // Prepare a guaranteed string for the user's name
        const name =
          profile.displayName?.trim() ||
          email.split("@")[0] ||
          "Sprintly User";

        // Check whether this Google account is already registered
        let user = await User.findOne({
          googleId: profile.id,
        });

        if (user) {
          return done(null, user);
        }

        // Check whether an account already exists with this email
        user = await User.findOne({ email });

        if (user) {
          if (user.googleId && user.googleId !== profile.id) {
            return done(
              new Error(
                "This email is linked to another Google account."
              ),
              false
            );
          }

          // Link the Google account to the existing user
          user.googleId = profile.id;
          user.isVerified = true;

          await user.save();

          return done(null, user);
        }

        // Create a new Google user
        const newUser = await User.create({
          name,
          email,
          googleId: profile.id,
          isVerified: true,
        });

        return done(null, newUser);
      } catch (error) {
        console.error(
          "Google authentication strategy error:",
          error
        );

        return done(error as Error, false);
      }
    }
  )
);

export default passport;
