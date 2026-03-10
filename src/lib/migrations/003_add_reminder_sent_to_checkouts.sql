-- Add reminder_sent_at column to checkouts
ALTER TABLE checkouts ADD COLUMN IF NOT EXISTS reminder_sent_at TIMESTAMPTZ;

-- Index for finding checkouts that need reminders
CREATE INDEX IF NOT EXISTS idx_checkouts_needs_reminder 
ON checkouts(due_date) 
WHERE returned_at IS NULL AND reminder_sent_at IS NULL;
