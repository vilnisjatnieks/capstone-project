CREATE TABLE verification_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token UUID NOT NULL DEFAULT gen_random_uuid(),
  type VARCHAR(50) NOT NULL CHECK (type IN ('email_verification', 'password_reset')),
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX idx_verification_tokens_token ON verification_tokens(token);
CREATE INDEX idx_verification_tokens_user_type ON verification_tokens(user_id, type);

ALTER TABLE users ADD COLUMN email_verified_at TIMESTAMPTZ;

-- Backfill: treat all existing users as already verified so they aren't locked out
UPDATE users SET email_verified_at = NOW() WHERE email_verified_at IS NULL;
