import { describe, expect, it, vi, beforeEach } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";

// students.ts uses the service-role client for Auth Admin API calls;
// replace it with a controllable stub.
const createUser = vi.fn();
const deleteUser = vi.fn();
vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => ({
    auth: { admin: { createUser, deleteUser } },
  }),
}));

import { listStudents, provisionStudent } from "@/lib/data/students";

const SEMESTER_ID = "22222222-2222-4222-8222-222222222222";
const LEVEL_ID = "33333333-3333-4333-8333-333333333333";

/** Chain stub for the admin-session client, capturing .eq() filters. */
function makeSessionClient(opts: {
  eqCalls: { column: string; value: unknown }[];
  listResult?: { data: unknown[]; count: number; error: null };
  semesterRow?: { level_id: string } | null;
  profileInsertError?: { message: string } | null;
}) {
  const insertedRows: Record<string, unknown>[] = [];
  const client = {
    from: (table: string) => {
      if (table === "profiles") {
        const builder: Record<string, unknown> = {};
        builder.select = () => builder;
        builder.eq = (column: string, value: unknown) => {
          opts.eqCalls.push({ column, value });
          return builder;
        };
        builder.or = () => builder;
        builder.order = () => builder;
        builder.range = () => builder;
        builder.then = (resolve: (v: unknown) => void) =>
          Promise.resolve(
            opts.listResult ?? { data: [], count: 0, error: null }
          ).then(resolve);
        builder.insert = async (row: Record<string, unknown>) => {
          insertedRows.push(row);
          return { error: opts.profileInsertError ?? null };
        };
        return builder;
      }
      if (table === "semesters") {
        return {
          select: () => ({
            eq: () => ({
              maybeSingle: async () => ({
                data: opts.semesterRow ?? null,
                error: null,
              }),
            }),
          }),
        };
      }
      throw new Error(`unexpected table: ${table}`);
    },
  };
  return { client: client as unknown as SupabaseClient, insertedRows };
}

describe("listStudents", () => {
  it("always filters profiles by role = student", async () => {
    const eqCalls: { column: string; value: unknown }[] = [];
    const { client } = makeSessionClient({ eqCalls });
    await listStudents(client, { page: 0 });
    expect(eqCalls).toContainEqual({ column: "role", value: "student" });
  });

  it("keeps the role filter when a search term is present", async () => {
    const eqCalls: { column: string; value: unknown }[] = [];
    const { client } = makeSessionClient({ eqCalls });
    await listStudents(client, { page: 0, search: "أحمد" });
    expect(eqCalls).toContainEqual({ column: "role", value: "student" });
  });
});

describe("provisionStudent", () => {
  beforeEach(() => {
    createUser.mockReset();
    deleteUser.mockReset();
  });

  const base = {
    fullName: "طالب تجريبي",
    universityId: "2024001",
    password: "secret-pass-1",
    semesterId: SEMESTER_ID,
    adminProfileId: "44444444-4444-4444-8444-444444444444",
  };

  it("rejects an invalid semester BEFORE creating an Auth user", async () => {
    const { client } = makeSessionClient({ eqCalls: [], semesterRow: null });
    const r = await provisionStudent({ ...base, adminClient: client as never });
    expect(r.ok).toBe(false);
    expect(createUser).not.toHaveBeenCalled();
  });

  it("creates Auth user then profile when the semester is valid", async () => {
    createUser.mockResolvedValue({
      data: { user: { id: "auth-1" } },
      error: null,
    });
    const { client, insertedRows } = makeSessionClient({
      eqCalls: [],
      semesterRow: { level_id: LEVEL_ID },
    });
    const r = await provisionStudent({ ...base, adminClient: client as never });
    expect(r).toEqual({ ok: true, userId: "auth-1" });
    expect(insertedRows).toHaveLength(1);
    expect(insertedRows[0]).toMatchObject({
      id: "auth-1",
      role: "student",
      semester_id: SEMESTER_ID,
      level_id: LEVEL_ID,
    });
    expect(deleteUser).not.toHaveBeenCalled();
  });

  it("rolls back the Auth user when profile creation fails", async () => {
    createUser.mockResolvedValue({
      data: { user: { id: "auth-2" } },
      error: null,
    });
    deleteUser.mockResolvedValue({ error: null });
    const { client } = makeSessionClient({
      eqCalls: [],
      semesterRow: { level_id: LEVEL_ID },
      profileInsertError: { message: "duplicate key" },
    });
    const r = await provisionStudent({ ...base, adminClient: client as never });
    expect(r.ok).toBe(false);
    expect(deleteUser).toHaveBeenCalledWith("auth-2");
  });
});
