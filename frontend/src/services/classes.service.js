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
                advisor:profiles!classes_advisor_id_fkey(id, full_name, teacher_code, email, phone, avatar_url),
                class_students(
                    id,
                    student:profiles(
                        id, 
                        full_name, 
                        student_code, 
                        email, 
                        phone,
                        avatar_url,
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
     * Ưu tiên gọi Edge Function để tạo auth users
     * Fallback: Tạo profiles trực tiếp (không tạo auth users)
     */
    bulkImportStudents: async (classId, students) => {
        if (!classId) {
            throw new Error('Thiếu mã lớp');
        }
        if (!Array.isArray(students) || students.length === 0) {
            throw new Error('Danh sách sinh viên không hợp lệ');
        }

        // Try Edge Function first (creates auth users + profiles)
        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) {
                throw new Error('Chưa đăng nhập');
            }

            const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
            const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

            const response = await fetch(`${supabaseUrl}/functions/v1/create-students`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${session.access_token}`,
                    'apikey': supabaseAnonKey,
                },
                body: JSON.stringify({ classId, students }),
            });

            if (response.ok) {
                const results = await response.json();
                console.log('Edge Function import results:', results);
                return results;
            }

            // If 4xx/5xx, log and fallback
            const errorText = await response.text();
            console.warn('Edge Function error, falling back to local:', response.status, errorText);
        } catch (edgeError) {
            console.warn('Edge Function unavailable, falling back to local:', edgeError.message);
        }

        // Fallback: Local import (no auth users)
        console.log('Using local fallback import...');
        const results = {
            created: 0,
            skipped: 0,
            added_to_class: 0,
            errors: [],
        };

        // Step 1: Get existing profiles by student_code
        const studentCodes = students.map(s => s.student_code);
        const { data: existingProfiles, error: fetchError } = await supabase
            .from('profiles')
            .select('id, student_code, email')
            .in('student_code', studentCodes);

        if (fetchError) {
            console.error('Error fetching existing profiles:', fetchError);
            throw new Error('Không thể kiểm tra sinh viên đã tồn tại');
        }

        const existingMap = new Map();
        existingProfiles?.forEach(p => existingMap.set(p.student_code, p));

        // Step 2: Prepare profiles to create (those not existing)
        const profilesToCreate = [];
        const classStudentsToInsert = [];
        const baseTime = Date.now();

        for (let i = 0; i < students.length; i++) {
            const student = students[i];
            const { student_code, full_name, phone, class_name, birth_date, gender } = student;

            if (!student_code || !full_name) {
                results.errors.push({ student_code: student_code || 'unknown', error: 'Thiếu thông tin bắt buộc' });
                continue;
            }

            const existing = existingMap.get(student_code);

            if (existing) {
                // Student exists - just add to class
                results.skipped++;
                classStudentsToInsert.push({
                    class_id: classId,
                    student_id: existing.id,
                    created_at: new Date(baseTime + i).toISOString(),
                });
            } else {
                // Need to create profile - generate UUID for new profile
                const newId = crypto.randomUUID();
                const email = `${student_code}@dnc.edu.vn`;

                profilesToCreate.push({
                    id: newId,
                    full_name,
                    email,
                    student_code,
                    phone: phone || null,
                    class_name: class_name || null,
                    birth_date: birth_date || null,
                    gender: gender || null,
                    role: 'student',
                    is_active: true,
                });

                classStudentsToInsert.push({
                    class_id: classId,
                    student_id: newId,
                    created_at: new Date(baseTime + i).toISOString(),
                });
            }
        }

        // Step 3: Create new profiles in batch
        if (profilesToCreate.length > 0) {
            const { error: createError } = await supabase
                .from('profiles')
                .upsert(profilesToCreate, { onConflict: 'student_code' });

            if (createError) {
                console.error('Error creating profiles:', createError);
                // Try individual inserts if batch fails
                for (const profile of profilesToCreate) {
                    const { error: individualError } = await supabase
                        .from('profiles')
                        .upsert(profile, { onConflict: 'student_code' });

                    if (individualError) {
                        results.errors.push({ student_code: profile.student_code, error: individualError.message });
                    } else {
                        results.created++;
                    }
                }
            } else {
                results.created = profilesToCreate.length;
            }
        }

        // Step 4: Add all students to class
        if (classStudentsToInsert.length > 0) {
            // Need to get actual profile IDs for newly created profiles
            const newStudentCodes = profilesToCreate.map(p => p.student_code);
            if (newStudentCodes.length > 0) {
                const { data: newProfiles } = await supabase
                    .from('profiles')
                    .select('id, student_code')
                    .in('student_code', newStudentCodes);

                // Update classStudentsToInsert with real IDs
                const newProfileMap = new Map();
                newProfiles?.forEach(p => newProfileMap.set(p.student_code, p.id));

                for (const cs of classStudentsToInsert) {
                    const profile = profilesToCreate.find(p => p.id === cs.student_id);
                    if (profile && newProfileMap.has(profile.student_code)) {
                        cs.student_id = newProfileMap.get(profile.student_code);
                    }
                }
            }

            const { error: classError } = await supabase
                .from('class_students')
                .upsert(classStudentsToInsert, { onConflict: 'class_id,student_id' });

            if (!classError) {
                results.added_to_class = classStudentsToInsert.length;
            } else {
                console.error('Error adding to class:', classError);
            }
        }

        console.log('Import results:', results);
        return results;
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

        const filtered = allStudents?.filter(s => !assignedIds.has(s.id)) || [];
        const seen = new Set();
        return filtered.filter(student => {
            const key = student.student_code || student.email || student.id;
            if (seen.has(key)) return false;
            seen.add(key);
            return true;
        });
    },
};

export default classesService;
