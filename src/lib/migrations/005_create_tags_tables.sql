-- Create tags table
CREATE TABLE IF NOT EXISTS tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) UNIQUE NOT NULL,
  color VARCHAR(7),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create work_tags join table
CREATE TABLE IF NOT EXISTS work_tags (
  work_id BIGINT NOT NULL REFERENCES works(id) ON DELETE CASCADE,
  tag_id UUID NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
  PRIMARY KEY (work_id, tag_id)
);

-- Indexes for efficient lookups
CREATE INDEX IF NOT EXISTS idx_work_tags_work_id ON work_tags(work_id);
CREATE INDEX IF NOT EXISTS idx_work_tags_tag_id ON work_tags(tag_id);
