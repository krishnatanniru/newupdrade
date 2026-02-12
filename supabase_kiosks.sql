-- Create kiosks table
CREATE TABLE IF NOT EXISTS kiosks (
    id TEXT PRIMARY KEY DEFAULT CONCAT('kiosk-', FLOOR(EXTRACT(EPOCH FROM NOW()) * 1000 + RANDOM() * 1000)::TEXT),
    branch_id TEXT NOT NULL REFERENCES branches(id),
    name VARCHAR(255) NOT NULL,
    location VARCHAR(500) NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by TEXT NOT NULL REFERENCES users(id),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable row level security
ALTER TABLE kiosks ENABLE ROW LEVEL SECURITY;

-- Create policies for kiosks table
CREATE POLICY "Users can view kiosks for their branch" ON kiosks
    FOR SELECT USING (
        auth.uid()::TEXT IN (SELECT id FROM users WHERE role = 'SUPER_ADMIN')
        OR branch_id IN (SELECT branch_id FROM users WHERE id = auth.uid()::TEXT)
    );

CREATE POLICY "Branch admins and managers can create kiosks for their branch" ON kiosks
    FOR INSERT WITH CHECK (
        auth.uid()::TEXT IN (SELECT id FROM users WHERE role IN ('SUPER_ADMIN', 'BRANCH_ADMIN'))
        AND branch_id IN (SELECT branch_id FROM users WHERE id = auth.uid()::TEXT)
    );

CREATE POLICY "Branch admins and managers can update kiosks for their branch" ON kiosks
    FOR UPDATE USING (
        auth.uid()::TEXT IN (SELECT id FROM users WHERE role IN ('SUPER_ADMIN', 'BRANCH_ADMIN'))
        AND branch_id IN (SELECT branch_id FROM users WHERE id = auth.uid()::TEXT)
    );

CREATE POLICY "Branch admins and managers can delete kiosks for their branch" ON kiosks
    FOR DELETE USING (
        auth.uid()::TEXT IN (SELECT id FROM users WHERE role IN ('SUPER_ADMIN', 'BRANCH_ADMIN'))
        AND branch_id IN (SELECT branch_id FROM users WHERE id = auth.uid()::TEXT)
    );

-- Create indexes
CREATE INDEX idx_kiosks_branch_id ON kiosks(branch_id);
CREATE INDEX idx_kiosks_is_active ON kiosks(is_active);