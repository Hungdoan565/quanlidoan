import { create } from 'zustand';
import { supabase } from '../lib/supabase';

/**
 * Auth Store - Quản lý trạng thái xác thực
 */
export const useAuthStore = create((set, get) => ({
    // State
    user: null,
    profile: null,
    role: null,
    isLoading: true,
    isAuthenticated: false,
    isCreatingUser: false, // Flag to prevent auth listener interference during user creation

    // Actions
    setUser: async (user) => {
        if (!user) {
            set({
                user: null,
                profile: null,
                role: null,
                isAuthenticated: false,
                isLoading: false,
            });
            return;
        }

        console.log('[Auth] setUser for:', user.email);

        // Keep loading state while fetching profile
        set({ user, isAuthenticated: true, isLoading: true });

        // Fetch profile to get correct role from database
        try {
            const { data: profile, error } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', user.id)
                .maybeSingle();

            if (error) {
                console.warn('[Auth] Profile fetch error:', error.message);
            }

            // Determine role: profile > user_metadata > default
            const role = profile?.role || user?.user_metadata?.role || 'student';
            console.log('[Auth] Profile loaded, role:', role);

            set({
                profile: profile || null,
                role,
                isLoading: false,
            });
        } catch (error) {
            console.error('[Auth] Profile fetch failed:', error);
            // Fallback to metadata role
            const role = user?.user_metadata?.role || 'student';
            set({
                profile: null,
                role,
                isLoading: false,
            });
        }
    },

    setProfile: (profile) => {
        set({ profile });
    },

    // Initialize auth state
    initialize: async () => {
        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (session?.user) {
                // Fetch profile from database FIRST to get correct role
                const { data: profile } = await supabase
                    .from('profiles')
                    .select('*')
                    .eq('id', session.user.id)
                    .single();

                // Use role from profiles table, fallback to user_metadata, then 'student'
                const role = profile?.role || session.user?.user_metadata?.role || 'student';

                set({
                    user: session.user,
                    profile: profile || null,
                    role,
                    isAuthenticated: true,
                    isLoading: false,
                });
            } else {
                set({ isLoading: false });
            }
        } catch (error) {
            console.error('Auth initialization error:', error);
            set({ isLoading: false });
        }
    },

    // Fetch user profile from database
    fetchProfile: async (userId) => {
        try {
            const { data: profile, error } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', userId)
                .single();

            if (error && error.code !== 'PGRST116') {
                // PGRST116 = no rows returned, which is okay for new users
                console.error('Fetch profile error:', error);
            }

            if (profile) {
                set({ profile, role: profile.role || get().role });
            }
        } catch (error) {
            console.error('Fetch profile error:', error);
        }
    },

    // Sign in with email/password
    signIn: async (email, password, rememberMe = false) => {
        const { data, error } = await supabase.auth.signInWithPassword({
            email,
            password,
        });

        if (error) throw error;

        // Fetch profile from database to get correct role
        let role = 'student';
        if (data.user) {
            const { data: profile } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', data.user.id)
                .single();

            // Use role from profiles table, fallback to user_metadata, then 'student'
            role = profile?.role || data.user?.user_metadata?.role || 'student';

            set({
                user: data.user,
                profile: profile || null,
                role,
                isAuthenticated: true,
                isLoading: false,
            });
        }

        // Note: Supabase handles session persistence automatically
        // rememberMe could be used for custom logic if needed

        return { ...data, role };
    },

    // Sign up new user
    signUp: async (email, password, fullName, role = 'student', studentId = null) => {
        const metadata = {
            full_name: fullName,
            role: role,
            student_id: studentId,
        };

        const { data, error } = await supabase.auth.signUp({
            email,
            password,
            options: {
                data: metadata,
                emailRedirectTo: `${window.location.origin}/auth/callback`,
            },
        });

        if (error) throw error;

        // If email confirmation is disabled, user is logged in immediately
        if (data.user && data.session) {
            // Wait a moment for trigger to execute
            await new Promise(r => setTimeout(r, 300));

            // Fetch profile with retry
            let profile = null;
            for (let i = 0; i < 3; i++) {
                const { data: fetchedProfile } = await supabase
                    .from('profiles')
                    .select('*')
                    .eq('id', data.user.id)
                    .maybeSingle();

                if (fetchedProfile) {
                    profile = fetchedProfile;
                    break;
                }

                if (i < 2) await new Promise(r => setTimeout(r, 500));
            }

            // Defensive: create profile if trigger failed
            if (!profile) {
                console.warn('[Auth] Trigger may have failed, creating profile manually');
                try {
                    const { data: createdProfile } = await supabase
                        .from('profiles')
                        .upsert({
                            id: data.user.id,
                            email: data.user.email,
                            full_name: fullName,
                            role: role,
                            student_code: role === 'student' ? studentId : null,
                        }, { onConflict: 'id' })
                        .select()
                        .single();
                    profile = createdProfile;
                } catch (profileError) {
                    console.error('[Auth] Manual profile creation failed:', profileError);
                }
            }

            set({
                user: data.user,
                profile: profile || null,
                role: profile?.role || role,
                isAuthenticated: true,
                isLoading: false,
            });
        }

        return data;
    },

    // Sign out
    signOut: async () => {
        await supabase.auth.signOut();
        set({
            user: null,
            profile: null,
            role: null,
            isAuthenticated: false,
        });
    },

    // Reset password - send recovery email
    resetPassword: async (email) => {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
            redirectTo: `${window.location.origin}/auth/callback`,
        });

        if (error) throw error;
        return true;
    },

    // Update password - for logged in user or after recovery
    updatePassword: async (newPassword) => {
        const { data, error } = await supabase.auth.updateUser({
            password: newPassword,
        });

        if (error) throw error;
        return data;
    },

    // Update user profile
    updateProfile: async (updates) => {
        const user = get().user;
        if (!user) throw new Error('Not authenticated');

        const { data, error } = await supabase
            .from('profiles')
            .update(updates)
            .eq('id', user.id)
            .select()
            .single();

        if (error) throw error;

        set({ profile: data });
        return data;
    },

    // Role checks
    isAdmin: () => get().role === 'admin',
    isTeacher: () => get().role === 'teacher',
    isStudent: () => get().role === 'student',

    // Check if user has any of the given roles
    hasRole: (roles) => {
        const currentRole = get().role;
        if (Array.isArray(roles)) {
            return roles.includes(currentRole);
        }
        return currentRole === roles;
    },
}));
