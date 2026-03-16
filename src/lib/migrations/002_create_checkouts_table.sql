-- Create checkouts table
CREATE TABLE IF NOT EXISTS checkouts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  work_id BIGINT NOT NULL REFERENCES works(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  checked_out_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  due_date TIMESTAMPTZ NOT NULL,
  returned_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for looking up checkouts by work
CREATE INDEX IF NOT EXISTS idx_checkouts_work_id ON checkouts(work_id);

-- Index for looking up checkouts by user
CREATE INDEX IF NOT EXISTS idx_checkouts_user_id ON checkouts(user_id);

-- Index for finding active (not returned) checkouts
CREATE INDEX IF NOT EXISTS idx_checkouts_returned_at ON checkouts(returned_at);
