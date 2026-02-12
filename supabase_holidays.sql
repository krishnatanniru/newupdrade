-- Create holidays table for branch holiday management
CREATE TABLE IF NOT EXISTS holidays (
  id TEXT PRIMARY KEY,
  date DATE NOT NULL,
  name TEXT NOT NULL,
  branch_id TEXT NOT NULL DEFAULT 'ALL',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE holidays ENABLE ROW LEVEL SECURITY;

-- Create policy to allow all authenticated users to read holidays
CREATE POLICY "Allow authenticated users to read holidays"
  ON holidays
  FOR SELECT
  TO authenticated
  USING (true);

-- Create policy to allow authenticated users to insert holidays
CREATE POLICY "Allow authenticated users to insert holidays"
  ON holidays
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Create policy to allow authenticated users to delete holidays
CREATE POLICY "Allow authenticated users to delete holidays"
  ON holidays
  FOR DELETE
  TO authenticated
  USING (true);

-- Enable real-time for holidays table
ALTER TABLE holidays REPLICA IDENTITY FULL;
