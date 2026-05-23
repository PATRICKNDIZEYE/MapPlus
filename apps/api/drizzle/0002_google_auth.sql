-- Google sign-in support
-- password_hash becomes optional (Google-only accounts have no password)
-- google_sub stores the Google subject id for stable identification
-- avatar_url cached from Google's `picture` claim
ALTER TABLE users
  ALTER COLUMN password_hash DROP NOT NULL,
  ADD COLUMN IF NOT EXISTS avatar_url TEXT,
  ADD COLUMN IF NOT EXISTS google_sub VARCHAR(100) UNIQUE;
