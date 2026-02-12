-- Migration: Add notification support to communications table
-- Run this in Supabase SQL Editor to enable the notification features

-- Add isRead column to communications table for tracking read status
ALTER TABLE communications 
ADD COLUMN IF NOT EXISTS "isRead" BOOLEAN DEFAULT FALSE;

-- Create index for faster notification queries
CREATE INDEX IF NOT EXISTS idx_communications_userId ON communications("userId");
CREATE INDEX IF NOT EXISTS idx_communications_branchId ON communications("branchId");
CREATE INDEX IF NOT EXISTS idx_communications_category ON communications(category);
CREATE INDEX IF NOT EXISTS idx_communications_isRead ON communications("isRead");

-- Enable real-time for communications table (if not already enabled)
ALTER TABLE communications REPLICA IDENTITY FULL;

-- Update existing communications to have isRead = true (mark all existing as read)
UPDATE communications SET "isRead" = TRUE WHERE "isRead" IS NULL;

-- Add comment for documentation
COMMENT ON COLUMN communications."isRead" IS 'Tracks if the user has read this notification';
