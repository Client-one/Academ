import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import { uploadMaterialFile } from "@/lib/data/materials";
import { insertWithNextOrderIndex, isOrderConflict } from "@/lib/data/ordering";
import { describeDbInsertError, describeStorageError } from "@/lib/data/upload-errors";

const ITEM = "44444444-4444-4444-8444-444444444444";
const COURSE = "33333333-3333-4333-8333-333333333333";
const KIND = "55555555-5555-4555-8555-555555555555";
const ADMIN = "66666666-6666-4666-8666-666666666666";

const pdfFile = () =>
  new File([new TextEncoder().encode("%PDF-1.4\n% test\n")], "lec.pdf", { type: "application/pdf" });

type DbErr = { code?: string; message: string };

interface Opts {
  existingMax?: number | (() => number);
  insertResults?: Array<{ data: { id: string } | null; error: DbErr | null }>;
  uploadError?: { message: string; statusCode?: string } | null;
  removeResult?: { data: unknown[] | null; error: { message: string } | null };
  kindCode?: string;
  itemError?: DbErr | null;
}

function makeClient(o: Opts = {}) {
  const inserted: Record<string, unknown>[] = [];
  const upload = vi.fn(async (_p: string, _b: Uint8Array, _o: unknown) =>
    (events.push("upload"), o.uploadError) ? { data: null, error: o.uploadError } : { data: { path: "x" }, error: null }
  );
  const remove = vi.fn(async (paths: string[]) =>
    o.removeResult ?? { data: paths.map((name) => ({ name })), error: null }
  );
  const deleteSpy = vi.fn();
  const events: string[] = [];
  let insertCall = 0;
  const maxOf = () => (typeof o.existingMax === "function" ? o.existingMax() : o.existingMax ?? 0);

  const client = {
    from: (table: string) => {
      if (table === "content_items") {
        return {
          select: () => ({
            eq: () => ({
              maybeSingle: async () =>
                o.itemError ? { data: null, error: o.itemError } : { data: { id: ITEM, course_id: COURSE }, error: null },
            }),
          }),
        };
      }
      if (table === "material_kinds") {
        return {
          select: () => ({
            eq: () => ({ maybeSingle: async () => ({ data: { code: o.kindCode ?? "official_professor_pdf" }, error: null }) }),
          }),
        };
      }
      if (table === "content_materials") {
        return {
          select: () => ({
            eq: () => ({
              order: () => ({
                limit: async () => {
                  const m = maxOf();
                  return { data: m ? [{ order_index: m }] : [], error: null };
                },
              }),
            }),
          }),
          insert: (row: Record<string, unknown>) => {
            events.push("insert");
            inserted.push(row);
            const res = o.insertResults?.[insertCall++] ?? { data: { id: row.id as string }, error: null };
            return { select: () => ({ single: async () => res }) };
          },
          delete: deleteSpy,
        };
      }
      throw new Error(`unexpected table ${table}`);
    },
    storage: { from: () => ({ upload, remove }) },
  } as unknown as SupabaseClient;
  return { client, inserted, upload, remove, deleteSpy, events };
}

const run = (c: SupabaseClient) =>
  uploadMaterialFile({
    client: c,
    contentItemId: ITEM,
    materialKindId: KIND,
    title: "عنوان",
    description: "",
    file: pdfFile(),
    adminProfileId: ADMIN,
  });

let errSpy: ReturnType<typeof vi.spyOn>;
beforeEach(() => {
  errSpy = vi.spyOn(console, "error").mockImplementation(() => {});
});
afterEach(() => errSpy.mockRestore());
const logged = () => errSpy.mock.calls.flat().join(" ");

describe("uploadMaterialFile — happy path", () => {
  it("inserts ONE finished row with an explicit order_index (regression: NOT NULL without default)", async () => {
    const t = makeClient({ existingMax: 4 });
    const r = await run(t.client);
    expect(r.ok).toBe(true);
    expect(t.inserted).toHaveLength(1);
    expect(t.inserted[0]).toMatchObject({
      order_index: 5,
      upload_status: "ready",
      status: "draft",
      content_item_id: ITEM,
      created_by: ADMIN,
    });
    expect(typeof t.inserted[0]!.order_index).toBe("number");
  });

  it("starts at 1 for an empty list", async () => {
    const t = makeClient({ existingMax: 0 });
    await run(t.client);
    expect(t.inserted[0]!.order_index).toBe(1);
  });

  it("uploads to {course}/{item}/{materialId}.pdf and records exactly that path + id", async () => {
    const t = makeClient();
    const r = await run(t.client);
    expect(r.ok).toBe(true);
    const path = t.upload.mock.calls[0]![0];
    const id = t.inserted[0]!.id as string;
    expect(path).toBe(`${COURSE}/${ITEM}/${id}.pdf`);
    expect(t.inserted[0]!.storage_path).toBe(path);
    expect(path).toMatch(/^[0-9a-f-]{36}\/[0-9a-f-]{36}\/[0-9a-f-]{36}\.pdf$/);
  });

  it("uploads BEFORE inserting and never calls .delete() on content_materials", async () => {
    const t = makeClient();
    await run(t.client);
    expect(t.events).toEqual(["upload", "insert"]);
    expect(t.deleteSpy).not.toHaveBeenCalled();
  });
});

describe("uploadMaterialFile — failure and rollback", () => {
  it("storage upload failure: no DB row is created and nothing needs rollback", async () => {
    const t = makeClient({ uploadError: { message: "new row violates row-level security policy", statusCode: "403" } });
    const r = await run(t.client);
    expect(r.ok).toBe(false);
    expect(t.inserted).toHaveLength(0);
    expect(t.remove).not.toHaveBeenCalled();
    expect(t.deleteSpy).not.toHaveBeenCalled();
    if (!r.ok) expect(r.error).toContain("صلاحية");
  });

  it("DB insert failure: removes the uploaded object and verifies the removal", async () => {
    const t = makeClient({ insertResults: [{ data: null, error: { code: "23503", message: "violates foreign key" } }] });
    const r = await run(t.client);
    expect(r.ok).toBe(false);
    const path = t.upload.mock.calls[0]![0];
    expect(t.remove).toHaveBeenCalledWith([path]);
    expect(logged()).not.toContain("material_orphan_file_cleanup_failed");
    expect(t.deleteSpy).not.toHaveBeenCalled();
  });

  it("does NOT treat remove() returning an empty list as success (policy denial) — logs an orphan", async () => {
    const t = makeClient({
      insertResults: [{ data: null, error: { code: "23503", message: "fk" } }],
      removeResult: { data: [], error: null },
    });
    const r = await run(t.client);
    expect(r.ok).toBe(false);
    expect(logged()).toContain("material_orphan_file_cleanup_failed");
  });

  it("logs an orphan when remove() itself errors", async () => {
    const t = makeClient({
      insertResults: [{ data: null, error: { code: "23503", message: "fk" } }],
      removeResult: { data: null, error: { message: "boom" } },
    });
    await run(t.client);
    expect(logged()).toContain("material_orphan_file_cleanup_failed");
  });

  it("retries an order_index collision with a re-read max, then succeeds", async () => {
    let max = 2;
    const t = makeClient({
      existingMax: () => max++, // a concurrent writer keeps advancing the max
      insertResults: [
        { data: null, error: { code: "23505", message: 'duplicate key value violates unique constraint "content_materials_order_uq"' } },
        { data: { id: "ok" }, error: null },
      ],
    });
    const r = await run(t.client);
    expect(r.ok).toBe(true);
    expect(t.inserted.map((x) => x.order_index)).toEqual([3, 4]);
    expect(t.remove).not.toHaveBeenCalled();
  });

  it("gives up after repeated collisions, rolls the file back and says so in Arabic", async () => {
    const conflict = { data: null, error: { code: "23505", message: 'violates unique constraint "content_materials_order_uq"' } };
    const t = makeClient({ insertResults: Array(5).fill(conflict) });
    const r = await run(t.client);
    expect(r.ok).toBe(false);
    expect(t.inserted).toHaveLength(5);
    expect(t.remove).toHaveBeenCalledTimes(1);
    if (!r.ok) expect(r.error).toContain("أعد المحاولة");
  });

  it("does not retry non-order errors", async () => {
    const t = makeClient({ insertResults: [{ data: null, error: { code: "23514", message: "check violation" } }] });
    await run(t.client);
    expect(t.inserted).toHaveLength(1);
  });

  it("rejects incompatible kind/file before touching Storage", async () => {
    const t = makeClient({ kindCode: "student_summary_image" });
    const r = await run(t.client);
    expect(r.ok).toBe(false);
    expect(t.upload).not.toHaveBeenCalled();
  });

  it("reports a failed parent lookup as an error, not as 'not found'", async () => {
    const t = makeClient({ itemError: { code: "XX000", message: "connection reset" } });
    const r = await run(t.client);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).not.toContain("غير موجود");
    expect(t.upload).not.toHaveBeenCalled();
  });
});

describe("safe error messages", () => {
  it("never leak SQL, constraint names, paths, keys or codes to the user", () => {
    const samples = [
      describeDbInsertError({ code: "23502", message: 'null value in column "order_index" of relation "content_materials"' }),
      describeDbInsertError({ code: "23505", message: 'violates unique constraint "content_materials_order_uq"' }),
      describeDbInsertError({ code: "42501", message: "permission denied for table content_materials" }),
      describeStorageError({ statusCode: "403", message: "new row violates row-level security policy" }),
      describeStorageError({ message: "Bucket not found" }),
      describeStorageError({ statusCode: "413", message: "The object exceeded the maximum allowed size" }),
      describeStorageError({ message: "something weird with eyJhbGciOi.secret" }),
    ];
    for (const s of samples) {
      expect(s).toMatch(/[؀-ۿ]/);
      expect(s).not.toMatch(/order_index|content_materials|constraint|relation|eyJ|secret|23\d\d\d|row-level|policy/i);
    }
  });

  it("maps the main failure classes to distinct actionable messages", () => {
    expect(describeStorageError({ statusCode: "404", message: "Bucket not found" })).toContain("Storage");
    expect(describeDbInsertError({ code: "42501", message: "x" })).toContain("صلاحية");
    expect(describeDbInsertError({ code: "23503", message: "x" })).toContain("حدّث الصفحة");
  });

  it("logs technical details server-side but not the file bytes or secrets", async () => {
    const t = makeClient({ insertResults: [{ data: null, error: { code: "23502", message: 'null value in column "order_index"' } }] });
    await run(t.client);
    const out = logged();
    expect(out).toContain("material_record_create_failed");
    expect(out).toContain("23502");
    expect(out).not.toMatch(/%PDF/);
  });
});

describe("ordering helper", () => {
  const conflictErr = { code: "23505", message: 'duplicate key value violates unique constraint "content_materials_order_uq"' };

  it("detects only order-slot conflicts", () => {
    expect(isOrderConflict(conflictErr)).toBe(true);
    expect(isOrderConflict({ code: "23505", message: 'violates unique constraint "courses_code_uq"' })).toBe(false);
    expect(isOrderConflict({ code: "23503", message: "content_materials_order_uq" })).toBe(false);
    expect(isOrderConflict(null)).toBe(false);
  });

  it("returns a read error without inserting", async () => {
    const client = {
      from: () => ({ select: () => ({ eq: () => ({ order: () => ({ limit: async () => ({ data: null, error: { code: "42501", message: "denied" } }) }) }) }) }),
    } as unknown as SupabaseClient;
    const insert = vi.fn();
    const r = await insertWithNextOrderIndex({ client, table: "t", parentColumn: "p", parentId: "x", insert });
    expect(r.error?.code).toBe("42501");
    expect(insert).not.toHaveBeenCalled();
  });
});
