import { supabase } from '../lib/supabase';

/**
 * Classes Service - Quản lý lớp học phần
 */
export const classesService = {
    /**
     * Lấy danh sách classes với filters
     */
    getAll: async (filters = {}) => {
        let query = supabase
            .from('classes')
            .select(`
                *,
                session:sessions(id, name, academic_year, semester, session_type, status),
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

        // Get all class IDs
        const classIds = data?.map(c => c.id) || [];

        // Fetch teacher_pairs separately
        let teacherPairsMap = {};
        if (classIds.length > 0) {
            const { data: pairs } = await supabase
                .from('teacher_pairs')
                .select('class_id, advisor_id, reviewer_id')
                .in('class_id', classIds);

            if (pairs && pairs.length > 0) {
                // Get unique teacher IDs
                const teacherIds = [...new Set(pairs.flatMap(p => [p.advisor_id, p.reviewer_id].filter(Boolean)))];

                // Fetch teacher profiles
                const { data: teachers } = await supabase
                    .from('profiles')
                    .select('id, full_name, teacher_code')
                    .in('id', teacherIds);

                const teacherMap = {};
                teachers?.forEach(t => { teacherMap[t.id] = t; });

                // Build pairs map
                pairs.forEach(p => {
                    teacherPairsMap[p.class_id] = {
                        advisor: teacherMap[p.advisor_id] || null,
                        reviewer: teacherMap[p.reviewer_id] || null,
                    };
                });
            }
        }

        // Transform data
        return data?.map(cls => ({
            ...cls,
            student_count: cls.class_students?.[0]?.count || 0,
            advisor: teacherPairsMap[cls.id]?.advisor || null,
            reviewer: teacherPairsMap[cls.id]?.reviewer || null,
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

        // Separate query for teacher_pairs to avoid FK naming issues
        let advisor = null;
        let reviewer = null;

        const { data: teacherPair } = await supabase
            .from('teacher_pairs')
            .select('id, advisor_id, reviewer_id')
            .eq('class_id', id)
            .maybeSingle();

        if (teacherPair) {
            // Fetch advisor profile
            if (teacherPair.advisor_id) {
                const { data: advisorData } = await supabase
                    .from('profiles')
                    .select('id, full_name, teacher_code, email, phone')
                    .eq('id', teacherPair.advisor_id)
                    .single();
                advisor = advisorData;
            }
            // Fetch reviewer profile
            if (teacherPair.reviewer_id) {
                const { data: reviewerData } = await supabase
                    .from('profiles')
                    .select('id, full_name, teacher_code, email, phone')
                    .eq('id', teacherPair.reviewer_id)
                    .single();
                reviewer = reviewerData;
            }
        }

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
            advisor,
            reviewer,
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
        const { error } = await supabase
            .from('classes')
            .delete()
            .eq('id', id);

        if (error) throw error;
        return true;
    },

    /**
     * Phân công cặp giảng viên cho class
     * Sử dụng UPSERT để tránh lỗi duplicate key
     */
    assignTeacherPair: async (classId, advisorId, reviewerId) => {
        const { data, error } = await supabase
            .from('teacher_pairs')
            .upsert({
                class_id: classId,
                advisor_id: advisorId,
                reviewer_id: reviewerId,
            }, {
                onConflict: 'class_id',
                ignoreDuplicates: false
            })
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
