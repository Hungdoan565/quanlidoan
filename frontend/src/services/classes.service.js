import { supabase } from '../lib/supabase';

/**
 * Classes Service - Quản lý lớp học phần
 */
export const classesService = {
    /**
     * Tìm class theo session + code
     */
    getBySessionAndCode: async (sessionId, code) => {
        const { data, error } = await supabase
            .from('classes')
            .select('id, code, name')
            .eq('session_id', sessionId)
            .eq('code', code)
            .maybeSingle();

        if (error) throw error;
        return data;
    },
    /**
     * Lấy danh sách classes với filters
     */
    getAll: async (filters = {}) => {
        let query = supabase
            .from('classes')
            .select(`
                *,
                session:sessions(id, name, academic_year, semester, session_type, status),
                advisor:profiles!classes_advisor_id_fkey(id, full_name, teacher_code),
                class_students(count)
            `);

        // Apply filters
        if (filters.session_id) {
            query = query.eq('session_id', filters.session_id);
        }
        if (filters.search) {
            query = query.or(`name.ilike.%${filters.search}%,code.ilike.%${filters.search}%`);
        }

        // Ordering
        query = query.order('created_at', { ascending: false });

        const { data, error } = await query;
        if (error) throw error;

        // Transform data
        return data?.map(cls => ({
            ...cls,
            student_count: cls.class_students?.[0]?.count || 0,
            advisor: cls.advisor || null,
        }));
    },

    /**
     * Lấy chi tiết class với students
     */
    getById: async (id) => {
        // Main class query
        const { data, error } = await supabase
            .from('classes')
            .select(`
                *,
                session:sessions(id, name, academic_year, semester, session_type, status),
                advisor:profiles!classes_advisor_id_fkey(id, full_name, teacher_code, email, phone),
                class_students(
                    id,
                    student:profiles(
                        id, 
                        full_name, 
                        student_code, 
                        email, 
                        phone,
                        gender,
                        birth_date,
                        class_name
                    ),
                    created_at
                )
            `)
            .eq('id', id)
            .single();

        if (error) throw error;

        // Get topics for students in this class
        const studentIds = data?.class_students?.map(cs => cs.student?.id).filter(Boolean) || [];

        let topicsMap = {};
        if (studentIds.length > 0) {
            const { data: topics } = await supabase
                .from('topics')
                .select('id, student_id, title, status')
                .eq('class_id', id);

            topics?.forEach(t => {
                topicsMap[t.student_id] = t;
            });
        }

        // Transform data
        return {
            ...data,
            advisor: data.advisor || null,
            students: data?.class_students?.map(cs => ({
                ...cs.student,
                joined_at: cs.created_at,
                topic: topicsMap[cs.student?.id] || null,
            })) || [],
        };
    },

    /**
     * Tạo class mới
     */
    create: async (data) => {
        const { data: cls, error } = await supabase
            .from('classes')
            .insert({
                session_id: data.session_id,
                code: data.code,
                name: data.name,
                max_students: data.max_students || 30,
            })
            .select()
            .single();

        if (error) throw error;
        return cls;
    },

    /**
     * Cập nhật class
     */
    update: async (id, data) => {
        const { data: cls, error } = await supabase
            .from('classes')
            .update({
                code: data.code,
                name: data.name,
                max_students: data.max_students,
            })
            .eq('id', id)
            .select()
            .single();

        if (error) throw error;
        return cls;
    },

    /**
     * Xóa class
     */
    delete: async (id) => {
        const { data, error } = await supabase
            .from('classes')
            .delete()
            .eq('id', id)
            .select('id')
            .limit(1);

        if (error) throw error;
        if (!data || data.length === 0) {
            throw new Error('Không thể xóa lớp học (không đủ quyền hoặc lớp không tồn tại)');
        }
        return true;
    },

    /**
     * Phân công cặp giảng viên cho class
     * Sử dụng UPSERT để tránh lỗi duplicate key
     */
    assignTeacherPair: async (classId, advisorId) => {
        if (!advisorId) {
            throw new Error('Vui lòng chọn giảng viên phụ trách');
        }

        const { data, error } = await supabase
            .from('classes')
            .update({
                advisor_id: advisorId,
            })
            .eq('id', classId)
            .select()
            .single();

        if (error) throw error;
        return data;
    },

    /**
     * Thêm sinh viên vào class
     */
    addStudent: async (classId, studentId) => {
        const { data, error } = await supabase
            .from('class_students')
            .insert({
                class_id: classId,
                student_id: studentId,
            })
            .select()
            .single();

        if (error) throw error;
        return data;
    },

    /**
     * Xóa sinh viên khỏi class
     */
    removeStudent: async (classId, studentId) => {
        const { error } = await supabase
            .from('class_students')
            .delete()
            .eq('class_id', classId)
            .eq('student_id', studentId);

        if (error) throw error;
        return true;
    },

    /**
     * Import danh sách sinh viên từ array IDs (existing students)
     */
    importStudents: async (classId, studentIds) => {
        const records = studentIds.map(studentId => ({
            class_id: classId,
            student_id: studentId,
        }));

        const { data, error } = await supabase
            .from('class_students')
            .upsert(records, { onConflict: 'class_id,student_id' })
            .select();

        if (error) throw error;
        return data;
    },

    /**
     * Bulk import sinh viên từ Excel data
     * - Gọi Edge Function để tạo auth users và profiles
     * - Thêm vào class
     */
    bulkImportStudents: async (classId, students) => {
        // Get current session for authorization
        const { data: { session } } = await supabase.auth.getSession();

        if (!session) {
            throw new Error('Chưa đăng nhập');
        }

        // Call Edge Function directly via fetch
        const functionUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/smart-service`;

        const response = await fetch(functionUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${session.access_token}`,
                'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
            },
            body: JSON.stringify({ classId, students }),
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error('Edge Function error:', response.status, errorText);
            throw new Error(`Lỗi ${response.status}: ${errorText || 'Không thể import sinh viên'}`);
        }

        const data = await response.json();

        // Check for errors in response
        if (data.errors && data.errors.length > 0 && data.created === 0 && data.skipped === 0) {
            throw new Error(`Import thất bại: ${data.errors[0].error}`);
        }

        return data;
    },

    /**
 * Lấy danh sách sinh viên chưa thuộc class nào trong session
 */
    getAvailableStudents: async (sessionId) => {
        // Lấy tất cả sinh viên
        const { data: allStudents, error: studentsError } = await supabase
            .from('profiles')
            .select('id, full_name, student_code, email')
            .eq('role', 'student')
            .eq('is_active', true)
            .order('full_name');

        if (studentsError) throw studentsError;

        // Lấy sinh viên đã được gán vào class của session này
        const { data: classes } = await supabase
            .from('classes')
            .select('id')
            .eq('session_id', sessionId);

        const classIds = classes?.map(c => c.id) || [];

        if (classIds.length === 0) return allStudents;

        const { data: assignedStudents } = await supabase
            .from('class_students')
            .select('student_id')
            .in('class_id', classIds);

        const assignedIds = new Set(assignedStudents?.map(s => s.student_id) || []);

        return allStudents?.filter(s => !assignedIds.has(s.id)) || [];
    },
};

export default classesService;
