import { supabase } from '../lib/supabase';

/**
 * Users Service - Quản lý người dùng
 */
export const usersService = {
    /**
     * Lấy danh sách users với filters và pagination
     * @param {Object} filters - Filter options
     * @param {number} page - Current page (1-indexed)
     * @param {number} limit - Items per page
     * @returns {Promise<{data: Array, total: number}>}
     */
    getAll: async (filters = {}, page = 1, limit = 15) => {
        // Calculate range for pagination
        const from = (page - 1) * limit;
        const to = from + limit - 1;

        const selectFields = filters.class_id
            ? '*, class_students!inner(class_id)'
            : '*';

        let query = supabase
            .from('profiles')
            .select(selectFields, { count: 'exact' }); // Get total count

        // Apply filters
        if (filters.role) {
            query = query.eq('role', filters.role);
        }
        if (filters.is_active !== undefined) {
            query = query.eq('is_active', filters.is_active);
        }
        if (filters.search) {
            query = query.or(`full_name.ilike.%${filters.search}%,email.ilike.%${filters.search}%,student_code.ilike.%${filters.search}%,teacher_code.ilike.%${filters.search}%`);
        }
        if (filters.department) {
            query = query.eq('department', filters.department);
        }
        if (filters.class_id) {
            query = query.eq('class_students.class_id', filters.class_id);
        }

        // Ordering and pagination
        query = query
            .order('created_at', { ascending: false })
            .range(from, to);

        const { data, count, error } = await query;
        if (error) throw error;

        return {
            data: data || [],
            total: count || 0
        };
    },

    /**
     * Lấy chi tiết user
     */
    getById: async (id) => {
        const { data, error } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', id)
            .single();

        if (error) throw error;
        return data;
    },

    /**
     * Lấy danh sách giảng viên
     */
    getTeachers: async () => {
        const { data, error } = await supabase
            .from('profiles')
            .select('id, full_name, teacher_code, email, department, academic_rank, is_active')
            .eq('role', 'teacher')
            .eq('is_active', true)
            .order('full_name');

        if (error) throw error;
        return data;
    },

    /**
     * Lấy danh sách sinh viên
     */
    getStudents: async (options = {}) => {
        let query = supabase
            .from('profiles')
            .select('id, full_name, student_code, email, phone, is_active')
            .eq('role', 'student');

        if (options.activeOnly !== false) {
            query = query.eq('is_active', true);
        }

        query = query.order('full_name');

        const { data, error } = await query;
        if (error) throw error;
        return data;
    },

    /**
     * Cập nhật profile user
     */
    update: async (id, data) => {
        const updateData = {};

        // Chỉ cập nhật các trường được phép
        const allowedFields = [
            'full_name', 'phone', 'avatar_url', 'department',
            'academic_rank', 'teacher_code', 'student_code', 'is_active'
        ];

        allowedFields.forEach(field => {
            if (data[field] !== undefined) {
                updateData[field] = data[field];
            }
        });

        const { data: user, error } = await supabase
            .from('profiles')
            .update(updateData)
            .eq('id', id)
            .select()
            .single();

        if (error) throw error;
        return user;
    },

    /**
     * Vô hiệu hóa / Kích hoạt user
     */
    toggleActive: async (id, isActive) => {
        const { data, error } = await supabase
            .from('profiles')
            .update({ is_active: isActive })
            .eq('id', id)
            .select()
            .single();

        if (error) throw error;
        return data;
    },

    /**
     * Lấy thống kê users theo role
     */
    getStats: async () => {
        const { data, error } = await supabase
            .from('profiles')
            .select('role, is_active');

        if (error) throw error;

        const stats = {
            total: data?.length || 0,
            admin: 0,
            teacher: 0,
            student: 0,
            active: 0,
            inactive: 0,
        };

        data?.forEach(user => {
            stats[user.role]++;
            if (user.is_active) {
                stats.active++;
            } else {
                stats.inactive++;
            }
        });

        return stats;
    },

    /**
     * Tạo user mới (Admin tạo cho Teacher/Admin)
     * Note: Cần sử dụng Supabase Admin API hoặc Edge Function
     */
    createUser: async (userData) => {
        // Đây là placeholder - thực tế cần Edge Function với admin privileges
        throw new Error('Tạo user cần thực hiện qua Supabase Dashboard hoặc Edge Function');
    },

    /**
     * Đổi role cho user
     */
    changeRole: async (id, newRole) => {
        if (!['admin', 'teacher', 'student'].includes(newRole)) {
            throw new Error('Role không hợp lệ');
        }

        const { data, error } = await supabase
            .from('profiles')
            .update({ role: newRole })
            .eq('id', id)
            .select()
            .single();

        if (error) throw error;
        return data;
    },

    /**
     * Lấy danh sách departments (unique từ profiles)
     */
    getDepartments: async () => {
        const { data, error } = await supabase
            .from('profiles')
            .select('department')
            .not('department', 'is', null);

        if (error) throw error;

        const uniqueDepts = [...new Set(data?.map(p => p.department).filter(Boolean))];
        return uniqueDepts.sort();
    },
};

export default usersService;
