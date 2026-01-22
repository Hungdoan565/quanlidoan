-- Migration: Add RLS policy for admin to insert profiles
-- This allows admin to import students via Excel

-- Drop existing policy if exists
DROP POLICY IF EXISTS "profiles_insert_admin" ON public.profiles;

-- Create INSERT policy for admin
CREATE POLICY "profiles_insert_admin" ON public.profiles
    FOR INSERT
    WITH CHECK (
        -- Allow admin to insert any profile
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- Also add DELETE policy for admin (for user management)
DROP POLICY IF EXISTS "profiles_delete_admin" ON public.profiles;

CREATE POLICY "profiles_delete_admin" ON public.profiles
    FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- Comment
COMMENT ON POLICY "profiles_insert_admin" ON public.profiles IS 'Admin can insert new profiles (for import students)';
COMMENT ON POLICY "profiles_delete_admin" ON public.profiles IS 'Admin can delete profiles';
