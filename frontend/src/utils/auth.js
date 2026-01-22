/**
 * Auth Utilities
 * Helper functions for authentication flow
 */

import { supabase } from '../lib/supabase';

/**
 * Sleep utility for async delays
 * @param {number} ms - Milliseconds to sleep
 */
export const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Fetch user profile with retry logic
 * Handles race condition where profile might not exist immediately after signup
 * 
 * @param {string} userId - User UUID
 * @param {number} maxRetries - Maximum retry attempts (default: 3)
 * @param {number} delayMs - Delay between retries in ms (default: 500)
 * @returns {Promise<Object|null>} Profile object or null if not found
 */
export const fetchProfileWithRetry = async (userId, maxRetries = 3, delayMs = 500) => {
    for (let attempt = 0; attempt < maxRetries; attempt++) {
        try {
            const { data: profile, error } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', userId)
                .maybeSingle();

            if (error && error.code !== 'PGRST116') {
                console.warn(`[Auth] Profile fetch attempt ${attempt + 1} error:`, error.message);
            }

            if (profile) {
                console.log(`[Auth] Profile found on attempt ${attempt + 1}`);
                return profile;
            }

            // Wait before next retry (except on last attempt)
            if (attempt < maxRetries - 1) {
                console.log(`[Auth] Profile not found, retrying in ${delayMs}ms...`);
                await sleep(delayMs);
            }
        } catch (error) {
            console.error(`[Auth] Profile fetch attempt ${attempt + 1} failed:`, error);
        }
    }

    console.warn('[Auth] Profile not found after all retries');
    return null;
};

/**
 * Create profile manually (defensive fallback if trigger fails)
 * 
 * @param {Object} userData - User data from Supabase Auth
 * @param {Object} metadata - User metadata (role, full_name, etc.)
 * @returns {Promise<Object|null>} Created profile or null
 */
export const createProfileFallback = async (userData, metadata = {}) => {
    try {
        const profileData = {
            id: userData.id,
            email: userData.email,
            full_name: metadata.full_name || userData.email.split('@')[0],
            role: metadata.role || 'student',
            student_code: metadata.role === 'student' ? metadata.student_id : null,
            teacher_code: metadata.role === 'teacher' ? metadata.teacher_code : null,
        };

        const { data: profile, error } = await supabase
            .from('profiles')
            .upsert(profileData, { onConflict: 'id' })
            .select()
            .single();

        if (error) {
            console.error('[Auth] Fallback profile creation failed:', error);
            return null;
        }

        console.log('[Auth] Fallback profile created successfully');
        return profile;
    } catch (error) {
        console.error('[Auth] Fallback profile creation error:', error);
        return null;
    }
};

/**
 * Get dashboard path based on user role
 * @param {string} role - User role (admin, teacher, student)
 * @returns {string} Dashboard path
 */
export const getDashboardPath = (role) => {
    switch (role) {
        case 'admin':
            return '/admin/dashboard';
        case 'teacher':
            return '/teacher/dashboard';
        case 'student':
        default:
            return '/student/dashboard';
    }
};
