-- =====================================================
-- Migration 035: Fix auth_logs RLS admin checks
-- Allow admin access based on JWT role metadata
-- =====================================================

-- Drop existing admin policies to redefine with broader checks
DROP POLICY IF EXISTS "Admin can read all auth logs" ON public.auth_logs;
DROP POLICY IF EXISTS "Admin can insert auth logs" ON public.auth_logs;

-- Admin can read all logs (profiles role OR JWT role metadata)
CREATE POLICY "Admin can read all auth logs"
    ON public.auth_logs
    FOR SELECT
    TO authenticated
    USING (
        public.is_admin()
        OR (auth.jwt() -> 'user_metadata' ->> 'role') = 'admin'
        OR (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
    );

-- Admin can insert logs (profiles role OR JWT role metadata)
CREATE POLICY "Admin can insert auth logs"
    ON public.auth_logs
    FOR INSERT
    TO authenticated
    WITH CHECK (
        public.is_admin()
        OR (auth.jwt() -> 'user_metadata' ->> 'role') = 'admin'
        OR (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
    );
