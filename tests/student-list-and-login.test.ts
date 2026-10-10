import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";

// ---- service-role stub (profiles lookup + Auth Admin getUserById) ----------
type Row = Record<string, unknown>;
let adminProfiles: Row[] = [];
let adminLookupError: { code: string; message: string } | null = null;
const getUserById = vi.fn();

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => ({
    from: (table: string) => {
      if (table !== "profiles") throw new Error(`unexpected admin table ${table}`);
      const filters: Record<string, unknown> = {};
      const b: Record<string, unknown> = {};
      b.select = () => b;
      b.eq = (c: string, v: unknown) => ((filters[c] = v), b);
      b.limit = () => b;
      b.then = (resolve: (v: unknown) => void) => {
        const data = adminLookupError
          ? null
          : adminProfiles.filter((r) => Object.entries(filters).every(([k, v]) => r[k] === v));
        return Promise.resolve({ data, error: adminLookupError }).then(resolve);
      };
      return b;
    },
    auth: { admin: { getUserById } },
  }),
}));

import { findStudentAuthEmail, listStudents } from "@/lib/data/students";
import { signInStudent } from "@/lib/security/student-auth";

const INTERNAL = "7d1f0c52-0000-4000-8000-000000000001@students.internal";
const STUDENT_ID = "11111111-1111-4111-8111-111111111111";

function seedStudent(over: Row = {}) {
  adminProfiles = [
    { id: STUDENT_ID, role: "student", is_active: true, university_id: "2024001", ...over },
  ];
  getUserById.mockResolvedValue({ data: { user: { email: INTERNAL } }, error: null });
}

/** Anon/session client stub for signInWithPassword + profile re-check. */
function makeSession(opts: {
  signInError?: boolean;
  profile?: { role: string; is_active: boolean } | null;
}) {
  const signInWithPassword = vi.fn(async () =>
    opts.signInError
      ? { data: { user: null }, error: { message: "Invalid login credentials" } }
      : { data: { user: { id: STUDENT_ID } }, error: null }
  );
  const signOut = vi.fn(async () => ({ error: null }));
  const client = {
    auth: { signInWithPassword, signOut },
    from: () => ({
      select: () => ({
        eq: () => ({ maybeSingle: async () => ({ data: opts.profile ?? null, error: null }) }),
      }),
    }),
  } as unknown as SupabaseClient;
  return { client, signInWithPassword, signOut };
}

let errSpy: ReturnType<typeof vi.spyOn>;
beforeEach(() => {
  adminProfiles = [];
  adminLookupError = null;
  getUserById.mockReset();
  errSpy = vi.spyOn(console, "error").mockImplementation(() => {});
});
afterEach(() => errSpy.mockRestore());

describe("student login", () => {
  it("signs in with a valid university id + password using the internal email", async () => {
    seedStudent();
    const s = makeSession({ profile: { role: "student", is_active: true } });
    const r = await signInStudent(s.client, "2024001", "correct-pass");
    expect(r).toEqual({ ok: true });
    expect(s.signInWithPassword).toHaveBeenCalledWith({ email: INTERNAL, password: "correct-pass" });
  });

  it("rejects a wrong password with a plain failure (no detail)", async () => {
    seedStudent();
    const s = makeSession({ signInError: true });
    const r = await signInStudent(s.client, "2024001", "wrong");
    expect(r).toEqual({ ok: false });
  });

  it("rejects an inactive student before any sign-in attempt", async () => {
    seedStudent({ is_active: false });
    const s = makeSession({ profile: { role: "student", is_active: false } });
    expect(await signInStudent(s.client, "2024001", "x")).toEqual({ ok: false });
    expect(s.signInWithPassword).not.toHaveBeenCalled();
  });

  it("rejects an unknown university id identically", async () => {
    seedStudent();
    const s = makeSession({});
    expect(await signInStudent(s.client, "9999999", "x")).toEqual({ ok: false });
    expect(s.signInWithPassword).not.toHaveBeenCalled();
  });

  it("does not let an admin account enter through the student form", async () => {
    seedStudent({ role: "admin" });
    const s = makeSession({ profile: { role: "admin", is_active: true } });
    expect(await signInStudent(s.client, "2024001", "x")).toEqual({ ok: false });
    expect(s.signInWithPassword).not.toHaveBeenCalled();
  });

  it("signs out and fails if the post-login profile check disagrees (stale lookup)", async () => {
    seedStudent();
    const s = makeSession({ profile: { role: "admin", is_active: true } });
    expect(await signInStudent(s.client, "2024001", "x")).toEqual({ ok: false });
    expect(s.signOut).toHaveBeenCalled();
  });

  it("refuses to guess when two active rows match", async () => {
    adminProfiles = [
      { id: "a", role: "student", is_active: true, university_id: "2024001" },
      { id: "b", role: "student", is_active: true, university_id: "2024001" },
    ];
    expect(await findStudentAuthEmail("2024001")).toBeNull();
  });

  it("returns null (not an exception) on a database error and never logs the email/password", async () => {
    adminLookupError = { code: "42501", message: "permission denied" };
    expect(await findStudentAuthEmail("2024001")).toBeNull();
    const logged = errSpy.mock.calls.flat().join(" ");
    expect(logged).not.toContain(INTERNAL);
    expect(logged).not.toMatch(/password/i);
  });

  it("the result type exposes no email to the caller", async () => {
    seedStudent();
    const s = makeSession({ profile: { role: "student", is_active: true } });
    const r = await signInStudent(s.client, "2024001", "pw");
    expect(JSON.stringify(r)).not.toContain("students.internal");
  });
});

// ---- admin list ------------------------------------------------------------
function listClient(tables: Record<string, { data: Row[] | null; count?: number; error?: { code?: string; message: string } | null }>) {
  return {
    from: (table: string) => {
      const t = tables[table]!;
      const b: Record<string, unknown> = {};
      for (const m of ["select", "eq", "or", "order", "range"]) b[m] = () => b;
      b.in = () => Promise.resolve({ data: t.data, error: t.error ?? null });
      b.then = (resolve: (v: unknown) => void) =>
        Promise.resolve({ data: t.data, count: t.count ?? 0, error: t.error ?? null }).then(resolve);
      return b;
    },
  } as unknown as SupabaseClient;
}

describe("admin students list", () => {
  it("shows active students with level and semester names", async () => {
    const client = listClient({
      profiles: {
        count: 1,
        data: [
          { id: STUDENT_ID, full_name: "طالب", role: "student", is_active: true, university_id: "2024001", level_id: "L1", semester_id: "S1" },
        ],
      },
      semesters: { data: [{ id: "S1", name: "الفصل الأول" }] },
      levels: { data: [{ id: "L1", name: "المستوى الأول" }] },
    });
    const { students, count } = await listStudents(client, { page: 0 });
    expect(count).toBe(1);
    expect(students[0]).toMatchObject({
      full_name: "طالب",
      is_active: true,
      level_name: "المستوى الأول",
      semester_name: "الفصل الأول",
    });
  });

  it("surfaces a database error as a safe, generic Arabic message (no internals)", async () => {
    const client = listClient({
      profiles: { data: null, error: { code: "PGRST201", message: "more than one relationship was found for 'profiles' and 'semesters'" } },
    });
    await expect(listStudents(client, { page: 0 })).rejects.toThrow("تعذر تحميل قائمة الطلاب.");
    await expect(listStudents(client, { page: 0 })).rejects.not.toThrow(/PGRST|relationship|profiles/);
  });

  it("surfaces a failure of the name lookups the same safe way", async () => {
    const client = listClient({
      profiles: { count: 1, data: [{ id: "x", role: "student", level_id: "L1", semester_id: "S1" }] },
      semesters: { data: null, error: { message: "boom" } },
      levels: { data: [] },
    });
    await expect(listStudents(client, { page: 0 })).rejects.toThrow("تعذر تحميل قائمة الطلاب.");
  });
});
