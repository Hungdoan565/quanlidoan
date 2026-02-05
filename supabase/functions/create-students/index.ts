// Supabase Edge Function: create-students
// Batch import students with auth user creation

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-auth",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Max-Age": "86400",
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

Deno.serve(async (req: Request) => {
  // Handle CORS preflight - MUST return 200 status
  if (req.method === "OPTIONS") {
    return new Response(null, { 
      status: 200,
      headers: corsHeaders 
    });
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

    const authHeader = req.headers.get("Authorization") || "";
    const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : "";

    if (!token) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { data: authData, error: authError } = await supabaseAdmin.auth.getUser(token);
    if (authError || !authData?.user) {
      return new Response(
        JSON.stringify({ error: "Invalid token" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { data: profile, error: profileError } = await supabaseAdmin
      .from("profiles")
      .select("role")
      .eq("id", authData.user.id)
      .single();

    if (profileError || profile?.role !== "admin") {
      return new Response(
        JSON.stringify({ error: "Forbidden" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { classId, students }: RequestBody = await req.json();

    if (!classId || !students || !Array.isArray(students)) {
      return new Response(
        JSON.stringify({ error: "Invalid request body" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Processing ${students.length} students for class ${classId}`);

    const results = {
      created: 0,
      skipped: 0,
      added_to_class: 0,
      errors: [] as { student_code: string; error: string }[],
    };

    // Batch check existing emails
    const emails = students.map((s) => `${s.student_code}@student.nctu.edu.vn`);
    const { data: existingProfiles } = await supabaseAdmin
      .from("profiles")
      .select("id, email, student_code")
      .in("email", emails);

    const existingMap = new Map<string, { id: string; student_code: string }>();
    existingProfiles?.forEach((p) => existingMap.set(p.email, { id: p.id, student_code: p.student_code }));

    console.log(`Found ${existingMap.size} existing profiles`);

    const classStudentsToInsert: { class_id: string; student_id: string; created_at: string }[] = [];
    const baseTime = Date.now();
    let orderIndex = 0;

    // Process in parallel batches for faster performance
    const BATCH_SIZE = 15; // Increased from 10
    const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

    // Process function for a single student
    const processStudent = async (student: StudentData, index: number) => {
      try {
        const { student_code, full_name, phone, class_name, birth_date, gender } = student;

        if (!student_code || !full_name) {
          results.errors.push({ student_code: student_code || "unknown", error: "Missing required fields" });
          return null;
        }

        const email = `${student_code}@student.nctu.edu.vn`;
        const password = student_code;

        const existing = existingMap.get(email);
        let userId: string;

        if (existing) {
          userId = existing.id;
          results.skipped++;
        } else {
          // Create auth user with retry (reduced retries)
          let retries = 2; // Reduced from 3
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
                await delay(200); // Reduced from 500ms
                retries--;
                continue;
              }
              break;
            }

            newUser = result.data;
            createError = null;
            break;
          }

          if (createError || !newUser) {
            results.errors.push({ student_code, error: createError?.message || "Failed to create user" });
            return null;
          }

          userId = newUser.user.id;

          // Upsert profile (simpler than update + fallback insert)
          const { error: profileError } = await supabaseAdmin
            .from("profiles")
            .upsert({
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
            }, { onConflict: 'id' });

          if (profileError) {
            console.error(`Profile upsert error for ${student_code}:`, profileError);
          }

          results.created++;
        }

        return {
          class_id: classId,
          student_id: userId,
          created_at: new Date(baseTime + index).toISOString(),
        };

      } catch (err) {
        results.errors.push({
          student_code: student.student_code || "unknown",
          error: err instanceof Error ? err.message : "Unknown error",
        });
        return null;
      }
    };

    // Process in parallel batches
    for (let i = 0; i < students.length; i += BATCH_SIZE) {
      const batch = students.slice(i, i + BATCH_SIZE);
      console.log(`Processing batch ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(students.length / BATCH_SIZE)}`);
      
      const batchResults = await Promise.all(
        batch.map((student, idx) => processStudent(student, orderIndex + idx))
      );

      // Collect valid results
      batchResults.forEach((result) => {
        if (result) {
          classStudentsToInsert.push(result);
        }
      });

      orderIndex += batch.length;

      // Small delay between batches to avoid overwhelming the system
      if (i + BATCH_SIZE < students.length) {
        await delay(100); // Short delay between batches
      }
    }

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
