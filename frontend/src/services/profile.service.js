import { supabase } from '../lib/supabase';

/**
 * Profile Service - Handles profile updates, avatar uploads, and notification settings
 */
export const profileService = {
    /**
     * Upload avatar image
     * @param {string} userId - User ID
     * @param {File} file - Image file to upload
     * @returns {Promise<string>} - Public URL of uploaded avatar
     */
    async uploadAvatar(userId, file) {
        // Validate file type
        const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
        if (!allowedTypes.includes(file.type)) {
            throw new Error('Chỉ chấp nhận file ảnh (JPEG, PNG, GIF, WebP)');
        }

        // Validate file size (max 2MB)
        const maxSize = 2 * 1024 * 1024;
        if (file.size > maxSize) {
            throw new Error('Kích thước file tối đa là 2MB');
        }

        // Generate unique filename
        const fileExt = file.name.split('.').pop();
        const fileName = `${userId}/avatar_${Date.now()}.${fileExt}`;

        // Delete old avatar if exists
        try {
            const { data: existingFiles } = await supabase.storage
                .from('avatars')
                .list(userId);

            if (existingFiles?.length > 0) {
                const filesToDelete = existingFiles.map(f => `${userId}/${f.name}`);
                await supabase.storage.from('avatars').remove(filesToDelete);
            }
        } catch (error) {
            console.warn('Could not delete old avatar:', error);
        }

        // Upload new avatar
        const { error: uploadError } = await supabase.storage
            .from('avatars')
            .upload(fileName, file, {
                cacheControl: '3600',
                upsert: true,
            });

        if (uploadError) throw uploadError;

        // Get public URL
        const { data: { publicUrl } } = supabase.storage
            .from('avatars')
            .getPublicUrl(fileName);

        // Update profile with new avatar URL
        const { error: updateError } = await supabase
            .from('profiles')
            .update({ avatar_url: publicUrl })
            .eq('id', userId);

        if (updateError) throw updateError;

        return publicUrl;
    },

    /**
     * Remove avatar
     * @param {string} userId - User ID
     */
    async removeAvatar(userId) {
        // Delete files from storage
        const { data: existingFiles } = await supabase.storage
            .from('avatars')
            .list(userId);

        if (existingFiles?.length > 0) {
            const filesToDelete = existingFiles.map(f => `${userId}/${f.name}`);
            await supabase.storage.from('avatars').remove(filesToDelete);
        }

        // Update profile
        const { error } = await supabase
            .from('profiles')
            .update({ avatar_url: null })
            .eq('id', userId);

        if (error) throw error;
    },

    /**
     * Update profile information
     * @param {string} userId - User ID
     * @param {Object} updates - Profile fields to update
     */
    async updateProfile(userId, updates) {
        const { data, error } = await supabase
            .from('profiles')
            .update(updates)
            .eq('id', userId)
            .select()
            .single();

        if (error) throw error;
        return data;
    },

    /**
     * Change password
     * @param {string} newPassword - New password
     */
    async changePassword(newPassword) {
        const { error } = await supabase.auth.updateUser({
            password: newPassword,
        });

        if (error) throw error;
        return true;
    },

    /**
     * Verify current password by re-authenticating
     * @param {string} email - User email
     * @param {string} password - Current password
     */
    async verifyCurrentPassword(email, password) {
        const { error } = await supabase.auth.signInWithPassword({
            email,
            password,
        });

        if (error) {
            throw new Error('Mật khẩu hiện tại không đúng');
        }
        return true;
    },

    /**
     * Get notification settings
     * @param {string} userId - User ID
     */
    async getNotificationSettings(userId) {
        const { data, error } = await supabase
            .from('notification_settings')
            .select('*')
            .eq('user_id', userId)
            .maybeSingle();

        if (error) throw error;

        // Return defaults if no settings exist
        if (!data) {
            return {
                email_topic_updates: true,
                email_logbook_feedback: true,
                email_grade_published: true,
                email_deadline_reminders: true,
                email_system_announcements: true,
                push_topic_updates: true,
                push_logbook_feedback: true,
                push_grade_published: true,
                push_deadline_reminders: true,
            };
        }

        return data;
    },

    /**
     * Update notification settings
     * @param {string} userId - User ID
     * @param {Object} settings - Settings to update
     */
    async updateNotificationSettings(userId, settings) {
        const { data, error } = await supabase
            .from('notification_settings')
            .upsert({
                user_id: userId,
                ...settings,
            }, { onConflict: 'user_id' })
            .select()
            .single();

        if (error) throw error;
        return data;
    },
};

export default profileService;
