-- =====================================================
-- Auth Logs - Audit trail for authentication events
-- =====================================================

-- Create auth_logs table
CREATE TABLE IF NOT EXISTS auth_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    email TEXT,                    -- Store email because user might be deleted
    event_type TEXT NOT NULL,      -- 'login_success', 'login_failed', 'logout', 'password_changed', 'password_reset_requested'
    status TEXT DEFAULT 'success', -- 'success', 'failed'
    error_message TEXT,            -- Error details if failed
    metadata JSONB DEFAULT '{}',   -- Extra info (role, etc)
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Create indexes for fast queries
CREATE INDEX IF NOT EXISTS idx_auth_logs_user_id ON auth_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_auth_logs_created_at ON auth_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_auth_logs_event_type ON auth_logs(event_type);
CREATE INDEX IF NOT EXISTS idx_auth_logs_email ON auth_logs(email);

-- Enable RLS
ALTER TABLE auth_logs ENABLE ROW LEVEL SECURITY;

-- Policy: Admin can read all logs
CREATE POLICY "Admin can read all auth logs"
    ON auth_logs
    FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role = 'admin'
        )
    );

-- Policy: Admin can insert logs (for logging from frontend)
CREATE POLICY "Admin can insert auth logs"
    ON auth_logs
    FOR INSERT
    TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role = 'admin'
        )
    );

-- Policy: Any authenticated user can insert their own login logs
CREATE POLICY "Users can log own auth events"
    ON auth_logs
    FOR INSERT
    TO authenticated
    WITH CHECK (
        user_id = auth.uid() OR user_id IS NULL
    );

-- Policy: Anon can insert failed login logs (for tracking failed attempts)
CREATE POLICY "Anon can log failed auth"
    ON auth_logs
    FOR INSERT
    TO anon
    WITH CHECK (
        status = 'failed' AND event_type = 'login_failed'
    );

-- Function to auto-cleanup old logs (30 days)
CREATE OR REPLACE FUNCTION cleanup_old_auth_logs()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    DELETE FROM auth_logs
    WHERE created_at < now() - INTERVAL '30 days';
END;
$$;

-- Grant execute to authenticated users (admin will call this)
GRANT EXECUTE ON FUNCTION cleanup_old_auth_logs() TO authenticated;

-- Comment for documentation
COMMENT ON TABLE auth_logs IS 'Audit trail for authentication events - auto-cleanup after 30 days';
COMMENT ON COLUMN auth_logs.event_type IS 'Event types: login_success, login_failed, logout, password_changed, password_reset_requested';
