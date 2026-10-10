import "server-only";
import { randomUUID } from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Profile } from "@/lib/types";
import { logError } from "@/lib/security/logger";
import { buildOrFilter } from "@/lib/validation/postgrest-escaping";

const INTERNAL_DOMAIN = "students.internal";

/**
 * Provision a student, in an explicit fail-fast order:
 *  1. Validate that the target semester exists and read its level_id
 *     (BEFORE creating anything — an invalid semesterId is a clear
 *     validation error, never a raw DB constraint violation).
 *  2. Create the Supabase Auth user with a server-generated internal email
 *     (never derived from the university number).
 *  3. Insert the profile row using the ADMIN SESSION (RLS), not service role.
 *  4. On partial failure: roll back the Auth user so no orphan remains;
 *     if the rollback itself fails, log it loudly (never silent).
 */
export async function provisionStudent(params: {
  adminClient: ReturnType<typeof createAdminClient>; // admin-session client (RLS)
  fullName: string;
  universityId: string;
  password: string;
  semesterId: string;
  adminProfileId: string;
}): Promise<{ ok: true; userId: string } | { ok: false; error: string }> {
  // Step 1 — semester must exist; its level is derived server-side so the
  // client can never forge an inconsistent level/semester pair.
  const { data: semester, error: semesterError } = await params.adminClient
    .from("semesters")
    .select("level_id")
    .eq("id", params.semesterId)
    .maybeSingle();
  if (semesterError) {
    logError("student_provision_semester_lookup_failed", { message: semesterError.message });
    return { ok: false, error: "تعذر التحقق من الفصل الدراسي." };
  }
  if (!semester) {
    return { ok: false, error: "الفصل الدراسي غير موجود." };
  }
  const levelId = (semester as { level_id: string }).level_id;

  // Step 2 — create the Auth user (Auth Admin API; the only service-role use).
  const admin = createAdminClient();
  const internalEmail = `${randomUUID()}@${INTERNAL_DOMAIN}`;
  const { data: authData, error: authError } = await admin.auth.admin.createUser({
    email: internalEmail,
    password: params.password,
    email_confirm: true,
    user_metadata: { full_name: params.fullName },
  });
  if (authError || !authData.user) {
    logError("student_provision_auth_failed", { message: authError?.message });
    return { ok: false, error: "تعذر إنشاء حساب المصادقة." };
  }

  // Step 3 — profile row via the admin session + RLS.
  const { error: profileError } = await params.adminClient.from("profiles").insert({
    id: authData.user.id,
    full_name: params.fullName,
    university_id: params.universityId,
    role: "student",
    semester_id: params.semesterId,
    level_id: levelId,
    is_active: true,
    created_by: params.adminProfileId,
  });

  if (profileError) {
    // Rollback: never leave an orphan Auth user without a profile.
    const { error: cleanupError } = await admin.auth.admin.deleteUser(authData.user.id);
    if (cleanupError) {
      // Orphaned Auth user — record it for manual cleanup, never silently.
      logError("student_provision_orphan_auth_cleanup_failed", {
        message: cleanupError.message,
      });
    }
    logError("student_provision_profile_failed", { message: profileError.message });
    return { ok: false, error: "تعذر إنشاء الملف الشخصي (ربما رقم الجامعة مستخدم لطالب نشط)." };
  }

  return { ok: true, userId: authData.user.id };
}

export async function listStudents(
  adminClient: SupabaseClient,
  options: { page: number; search?: string }
): Promise<{ students: (Profile & { level_name: string | null; semester_name: string | null })[]; count: number }> {
  const pageSize = 25;
  // NOTE: no PostgREST embed (`semesters(name)`) here. profiles has TWO
  // foreign keys to semesters (semester_id and the composite
  // (semester_id, level_id)), so the embed is ambiguous and PostgREST fails
  // the whole request with PGRST201 — the list then never rendered. Names are
  // resolved with two small explicit lookups instead.
  let query = adminClient
    .from("profiles")
    .select("*", { count: "exact" })
    // Server-side guarantee: admin accounts never enter the student list —
    // not the rows, not the count, not search results or pagination.
    .eq("role", "student")
    .order("created_at", { ascending: false })
    .range(options.page * pageSize, options.page * pageSize + pageSize - 1);

  // Bound the search term; user input is escaped before entering .or().
  const term = options.search?.trim().slice(0, 120);
  if (term) {
    query = query.or(buildOrFilter(["full_name", "university_id"], term));
  }

  const { data, count, error } = await query;
  if (error) {
    logError("students_list_failed", { code: error.code, message: error.message });
    throw new Error("تعذر تحميل قائمة الطلاب.");
  }
  const rows = (data ?? []) as unknown as Profile[];

  const semesterIds = [...new Set(rows.map((r) => r.semester_id).filter((v): v is string => !!v))];
  const levelIds = [...new Set(rows.map((r) => r.level_id).filter((v): v is string => !!v))];
  const semesterNames = new Map<string, string>();
  const levelNames = new Map<string, string>();

  if (semesterIds.length > 0) {
    const res = await adminClient.from("semesters").select("id, name").in("id", semesterIds);
    if (res.error) {
      logError("students_list_semesters_failed", { code: res.error.code, message: res.error.message });
      throw new Error("تعذر تحميل قائمة الطلاب.");
    }
    for (const r of (res.data ?? []) as { id: string; name: string }[]) semesterNames.set(r.id, r.name);
  }
  if (levelIds.length > 0) {
    const res = await adminClient.from("levels").select("id, name").in("id", levelIds);
    if (res.error) {
      logError("students_list_levels_failed", { code: res.error.code, message: res.error.message });
      throw new Error("تعذر تحميل قائمة الطلاب.");
    }
    for (const r of (res.data ?? []) as { id: string; name: string }[]) levelNames.set(r.id, r.name);
  }

  const students = rows.map((row) => ({
    ...row,
    level_name: (row.level_id && levelNames.get(row.level_id)) || null,
    semester_name: (row.semester_id && semesterNames.get(row.semester_id)) || null,
  }));
  return { students, count: count ?? 0 };
}

/**
 * Private lookup: university number → internal Auth email. SERVER-ONLY,
 * service role (profiles is RLS-protected and the caller is anonymous).
 * Returns null for unknown / inactive / non-student / any failure, so the
 * caller can answer with ONE generic error. The email never leaves the server.
 *
 * Replaces the old `rpc("student_auth_email")`: that function lives in the
 * non-exposed `app_private` schema (and service_role was never granted USAGE
 * on it), so PostgREST could never resolve the call and every login failed
 * with the generic error.
 */
export async function findStudentAuthEmail(universityId: string): Promise<string | null> {
  const admin = createAdminClient();
  const { data: rows, error } = await admin
    .from("profiles")
    .select("id")
    .eq("role", "student")
    .eq("is_active", true)
    .eq("university_id", universityId)
    .limit(2);
  if (error) {
    logError("student_lookup_failed", { code: error.code, message: error.message });
    return null;
  }
  // The partial unique index guarantees at most one active match; refuse to
  // guess if that invariant is ever broken.
  if (!rows || rows.length !== 1) return null;

  const { data: authData, error: authError } = await admin.auth.admin.getUserById(
    (rows[0] as { id: string }).id
  );
  if (authError || !authData?.user?.email) {
    logError("student_lookup_auth_failed", { message: authError?.message });
    return null;
  }
  return authData.user.email;
}

/** Deactivate = deny future protected operations immediately (Auth ban). */
export async function setStudentActive(
  studentAuthId: string,
  active: boolean
): Promise<{ ok: boolean; error?: string }> {
  const admin = createAdminClient();
  const { error } = await admin.auth.admin.updateUserById(studentAuthId, {
    ban_duration: active ? "0s" : "876000h",
  });
  if (error) {
    logError("student_set_active_failed", { message: error.message });
    return { ok: false, error: "تعذر تحديث حالة الحساب." };
  }
  return { ok: true };
}

export async function resetStudentPassword(
  studentAuthId: string,
  newPassword: string
): Promise<{ ok: boolean; error?: string }> {
  const admin = createAdminClient();
  const { error } = await admin.auth.admin.updateUserById(studentAuthId, {
    password: newPassword,
  });
  if (error) return { ok: false, error: "تعذر إعادة تعيين كلمة المرور." };
  return { ok: true };
}
