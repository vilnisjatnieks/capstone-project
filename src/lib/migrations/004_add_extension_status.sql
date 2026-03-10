-- Add extension_status to checkouts table
ALTER TABLE checkouts
ADD COLUMN IF NOT EXISTS extension_status VARCHAR(20) NOT NULL DEFAULT 'none';

ALTER TABLE checkouts
DROP CONSTRAINT IF EXISTS check_extension_status;

ALTER TABLE checkouts
ADD CONSTRAINT check_extension_status CHECK (extension_status IN ('none', 'pending', 'approved', 'rejected'));
