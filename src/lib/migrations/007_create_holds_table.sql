CREATE TABLE IF NOT EXISTS holds (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  work_id BIGINT NOT NULL REFERENCES works(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (work_id),
  UNIQUE (user_id)
);
CREATE INDEX IF NOT EXISTS idx_holds_work_id ON holds(work_id);
CREATE INDEX IF NOT EXISTS idx_holds_user_id ON holds(user_id);
