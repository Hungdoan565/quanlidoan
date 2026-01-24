// Supabase Edge Function: smart-service (create-students)
// OPTIMIZED VERSION - Batch processing for better performance

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
};

interface StudentData {
    student_code: string;
    full_name: string;
    email?: string;
    phone?: string;
    class_name?: string;
    birth_date?: string;
    gender?: string;
}

interface RequestBody {
    classId: string;
    students: StudentData[];
}

serve(async (req: Request) => {
    if (req.method === "OPTIONS") {
        return new Response("ok", { headers: corsHeaders });
    }

    try {
        const supabaseUrl = Deno.env.get("SUPABASE_URL");
        const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

        if (!supabaseUrl || !supabaseServiceKey) {
            return new Response(
                JSON.stringify({ error: "Server configuration error" }),
                { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
        }

        const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
            auth: { autoRefreshToken: false, persistSession: false },
        });

        const { classId, students }: RequestBody = await req.json();

        if (!classId || !students || !Array.isArray(students)) {
            return new Response(
                JSON.stringify({ error: "Invalid request body" }),
                { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
        }

        console.log(`Processing ${students.length} students for class ${classId}`);

        // Results tracking
        const results = {
            created: 0,
            skipped: 0,
            added_to_class: 0,
            errors: [] as { student_code: string; error: string }[],
        };

        // OPTIMIZATION 1: Batch check existing emails
        const emails = students.map(s => `${s.student_code}@dnc.edu.vn`);
        const { data: existingProfiles } = await supabaseAdmin
            .from("profiles")
            .select("id, email, student_code")
            .in("email", emails);

        const existingMap = new Map<string, { id: string; student_code: string }>();
        existingProfiles?.forEach(p => existingMap.set(p.email, { id: p.id, student_code: p.student_code }));

        console.log(`Found ${existingMap.size} existing profiles`);

        // OPTIMIZATION 2: Process sequentially with delay to avoid rate limiting
        // Supabase Auth Admin API has strict rate limits
        const DELAY_MS = 100; // 100ms delay between each user creation
        
        const classStudentsToInsert: { class_id: string; student_id: string }[] = [];

        // Helper function to delay
        const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

        for (const student of students) {
            try {
                const { student_code, full_name, phone, class_name, birth_date, gender } = student;

                if (!student_code || !full_name) {
                    results.errors.push({ student_code: student_code || "unknown", error: "Missing required fields" });
                    continue;
                }

                const email = `${student_code}@dnc.edu.vn`;
                const password = student_code;

                // Check if already exists
                const existing = existingMap.get(email);
                let userId: string;

                if (existing) {
                    userId = existing.id;
                    results.skipped++;
                } else {
                    // Create new auth user with retry logic
                    let retries = 3;
                    let createError: Error | null = null;
                    let newUser = null;

                    while (retries > 0) {
                        const result = await supabaseAdmin.auth.admin.createUser({
                            email,
                            password,
                            email_confirm: true,
                            user_metadata: { full_name, student_code, role: "student" },
                        });

                        if (result.error) {
                            createError = result.error;
                            if (result.error.message.includes("rate") || result.error.message.includes("reset")) {
                                // Rate limited - wait longer and retry
                                await delay(1000);
                                retries--;
                                continue;
                            }
                            break; // Other error, don't retry
                        }

                        newUser = result.data;
                        createError = null;
                        break;
                    }

                    if (createError || !newUser) {
                        results.errors.push({ student_code, error: createError?.message || "Failed to create user" });
                        continue;
                    }

                    userId = newUser.user.id;

                    // Create profile
                    await supabaseAdmin.from("profiles").upsert({
                        id: userId,
                        full_name,
                        email,
                        student_code,
                        phone: phone || null,
                        class_name: class_name || null,
                        birth_date: birth_date || null,
                        gender: gender || null,
                        role: "student",
                        is_active: true,
                    }, { onConflict: "id" });

                    results.created++;

                    // Add delay between user creations to avoid rate limiting
                    await delay(DELAY_MS);
                }

                // Collect for batch insert to class
                classStudentsToInsert.push({ class_id: classId, student_id: userId });

            } catch (err) {
                results.errors.push({
                    student_code: student.student_code || "unknown",
                    error: err instanceof Error ? err.message : "Unknown error",
                });
            }
        }

        // OPTIMIZATION 3: Batch insert to class_students
        if (classStudentsToInsert.length > 0) {
            const { error: classError } = await supabaseAdmin
                .from("class_students")
                .upsert(classStudentsToInsert, { onConflict: "class_id,student_id" });

            if (!classError) {
                results.added_to_class = classStudentsToInsert.length;
            } else {
                console.error("Batch class insert error:", classError);
            }
        }

        console.log("Import results:", results);

        return new Response(
            JSON.stringify(results),
            { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );

    } catch (error) {
        console.error("Function error:", error);
        return new Response(
            JSON.stringify({ error: error instanceof Error ? error.message : "Internal server error" }),
            { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
    }
});
