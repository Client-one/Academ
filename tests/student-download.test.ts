import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import fs from "node:fs";
import path from "node:path";
import type { SupabaseClient } from "@supabase/supabase-js";
import { NextRequest } from "next/server";

const state: {
  user: { id: string } | null;
  profile: Record<string, unknown> | null;
  material: Record<string, unknown> | null;
  materialError: { code?: string; message: string } | null;
  signError: { message: string } | null;
} = { user: null, profile: null, material: null, materialError: null, signError: null };

const createSignedUrl = vi.fn(async (p: string, ttl: number, opts?: unknown) =>
  state.signError
    ? { data: null, error: state.signError }
    : {
        data: { signedUrl: `https://proj.supabase.co/storage/v1/object/sign/content-files/${p}?token=TOK` },
        error: null,
        _ttl: ttl,
        _opts: opts,
      }
);

function stubClient() {
  return {
    auth: { getUser: async () => ({ data: { user: state.user } }) },
    from: (table: string) => ({
      select: () => ({
        eq: () => ({
          maybeSingle: async () =>
            table === "profiles"
              ? { data: state.profile, error: null }
              : { data: state.material, error: state.materialError },
        }),
      }),
    }),
    storage: { from: () => ({ createSignedUrl }) },
  } as unknown as SupabaseClient;
}

vi.mock("@/lib/supabase/server", () => ({ createClient: async () => stubClient() }));

import { buildDownloadFilename, getMaterialDownloadForStudent } from "@/lib/data/materials";
import { GET } from "@/app/download/[materialId]/route";

const MID = "55555555-5555-4555-8555-555555555555";
const SEM_A = "22222222-2222-4222-8222-222222222222";
const SEM_B = "22222222-2222-4222-8222-222222222223";
const PATH = `33333333-3333-4333-8333-333333333333/44444444-4444-4444-8444-444444444444/${MID}.pdf`;

function material(over: Record<string, unknown> = {}, chain: Record<string, unknown> = {}) {
  return {
    id: MID,
    title: "محاضرة 1",
    status: "published",
    upload_status: "ready",
    storage_path: PATH,
    article: null,
    content_items: {
      status: "published",
      course_id: "c",
      courses: { status: "published", semester_id: SEM_A },
      ...chain,
    },
    ...over,
  };
}

let errSpy: ReturnType<typeof vi.spyOn>;
let userCounter = 0;
beforeEach(() => {
  errSpy = vi.spyOn(console, "error").mockImplementation(() => {});
  createSignedUrl.mockClear();
  state.user = { id: `user-${++userCounter}` };
  state.profile = { role: "student", is_active: true, semester_id: SEM_A, level_id: "L1" };
  state.material = material();
  state.materialError = null;
  state.signError = null;
});
afterEach(() => errSpy.mockRestore());

const call = async (id = MID) =>
  GET(new NextRequest(`http://localhost/download/${id}`), { params: Promise.resolve({ materialId: id }) });

describe("buildDownloadFilename", () => {
  it("keeps Arabic titles and appends the allowlisted extension", () => {
    expect(buildDownloadFilename("محاضرة 1", PATH)).toBe("محاضرة 1.pdf");
  });
  it("strips path separators, quotes, control and bidi characters", () => {
    const n = buildDownloadFilename('../../etc/pass"wd\r\n‮fdp', PATH);
    expect(n).not.toMatch(/[\/\\"\r\n‮]/);
    expect(n.endsWith(".pdf")).toBe(true);
  });
  it("falls back to a neutral name and a safe extension", () => {
    expect(buildDownloadFilename("///", `a/b/c.exe`)).toBe("material.pdf");
    expect(buildDownloadFilename("x", `a/b/c.PNG`)).toBe("x.png");
  });
  it("limits the length", () => {
    expect(buildDownloadFilename("ا".repeat(500), PATH).length).toBeLessThanOrEqual(84);
  });
});

describe("getMaterialDownloadForStudent — authorization", () => {
  const run = (sem = SEM_A) => getMaterialDownloadForStudent(stubClient(), MID, sem);

  it("allows a published material of the student's own semester", async () => {
    const r = await run();
    expect(r.ok).toBe(true);
    expect(createSignedUrl).toHaveBeenCalledWith(PATH, 60);
  });

  it("denies another semester's material (forged id / URL) and never signs", async () => {
    const r = await run(SEM_B);
    expect(r).toEqual({ ok: false, status: "unauthorized" });
    expect(createSignedUrl).not.toHaveBeenCalled();
  });

  it.each([
    ["draft material", material({ status: "draft" })],
    ["archived material", material({ status: "archived" })],
    ["draft item", material({}, { status: "draft" })],
    ["draft course", material({}, { courses: { status: "draft", semester_id: SEM_A } })],
  ])("denies %s", async (_n, row) => {
    state.material = row;
    expect((await run()).ok).toBe(false);
    expect(createSignedUrl).not.toHaveBeenCalled();
  });

  it.each([
    ["upload pending", material({ upload_status: "pending", storage_path: null, status: "draft" })],
    ["article-only (no file)", material({ upload_status: "none", storage_path: null, article: { schemaVersion: 1 } })],
    ["ready without path", material({ storage_path: null })],
  ])("has nothing to download for %s", async (_n, row) => {
    state.material = row;
    expect((await run()).ok).toBe(false);
    expect(createSignedUrl).not.toHaveBeenCalled();
  });

  it("returns not_found when RLS hides the row or the lookup fails", async () => {
    state.material = null;
    expect(await run()).toEqual({ ok: false, status: "not_found" });
    state.material = material();
    state.materialError = { code: "XX000", message: "boom" };
    expect(await run()).toEqual({ ok: false, status: "not_found" });
  });

  it("fails closed when Storage refuses to sign", async () => {
    state.signError = { message: "denied" };
    expect(await run()).toEqual({ ok: false, status: "not_found" });
  });
});

describe("download URL", () => {
  it("is temporary, forces a download name, and encodes an Arabic name exactly once", async () => {
    const r = await getMaterialDownloadForStudent(stubClient(), MID, SEM_A);
    if (!r.ok) throw new Error("expected ok");
    const u = new URL(r.url);
    expect(u.searchParams.get("token")).toBe("TOK");
    // What Storage reads must equal the real name (regression: double encoding => "%D9%85...").
    expect(u.searchParams.get("download")).toBe("محاضرة 1.pdf");
    expect(r.url).not.toContain("%25");
    expect(r.filename).toBe("محاضرة 1.pdf");
  });
});

describe("GET /download/[materialId]", () => {
  it("redirects an authorized student (302) to the temporary URL with no-store", async () => {
    const res = await call();
    expect(res.status).toBe(302);
    const loc = res.headers.get("location")!;
    expect(loc.startsWith("https://proj.supabase.co/storage/v1/object/sign/content-files/")).toBe(true);
    expect(res.headers.get("cache-control")).toBe("no-store");
    expect(res.headers.get("referrer-policy")).toBe("no-referrer");
  });

  it("sends an anonymous visitor to /login without signing anything", async () => {
    state.user = null;
    const res = await call();
    expect(res.status).toBe(307);
    expect(new URL(res.headers.get("location")!).pathname).toBe("/login");
    expect(createSignedUrl).not.toHaveBeenCalled();
  });

  it.each([
    ["an admin", { role: "admin", is_active: true, semester_id: null, level_id: null }],
    ["an inactive student", { role: "student", is_active: false, semester_id: SEM_A, level_id: "L1" }],
    ["a student without semester", { role: "student", is_active: true, semester_id: null, level_id: "L1" }],
  ])("answers %s with a neutral 404", async (_n, profile) => {
    state.profile = profile;
    const res = await call();
    expect(res.status).toBe(404);
    expect(createSignedUrl).not.toHaveBeenCalled();
  });

  it("denies a student of ANOTHER semester with the same neutral 404 (no existence leak)", async () => {
    state.profile = { role: "student", is_active: true, semester_id: SEM_B, level_id: "L1" };
    const res = await call();
    expect(res.status).toBe(404);
    expect(await res.text()).toBe("المادة غير متاحة.");
    expect(createSignedUrl).not.toHaveBeenCalled();
  });

  it("rejects a malformed id before touching the database", async () => {
    const res = await call("not-a-uuid");
    expect(res.status).toBe(404);
    expect(createSignedUrl).not.toHaveBeenCalled();
  });

  it("never reveals the storage path or token in an error response", async () => {
    state.signError = { message: `denied for ${PATH}` };
    const res = await call();
    const body = await res.text();
    expect(res.status).toBe(404);
    expect(body).not.toContain(PATH);
    expect(body).not.toContain("TOK");
    expect(res.headers.get("location")).toBeNull();
  });

  it("is rate limited per student (429)", async () => {
    let last = 0;
    for (let i = 0; i < 62; i++) last = (await call()).status;
    expect(last).toBe(429);
  });
});

describe("student UI exposes download only", () => {
  const files = [
    "app/(student)/courses/[courseId]/[contentItemId]/page.tsx",
    "app/(student)/courses/[courseId]/page.tsx",
    "app/(student)/courses/page.tsx",
    "app/(student)/dashboard/page.tsx",
    "components/download-link.tsx",
    "components/student-nav.tsx",
  ];
  const read = (f: string) => fs.readFileSync(path.resolve(__dirname, "..", f), "utf8");

  it("has no link to /read, no open/view wording and no new-tab links", () => {
    for (const f of files) {
      const src = read(f);
      expect(src, f).not.toMatch(/\/read\b/);
      expect(src, f).not.toMatch(/فتح الملف|افتح الملف|اقرأ الآن|نسخة للقراءة|معاينة/);
      expect(src, f).not.toMatch(/target=["']_blank["']/);
    }
  });

  it("uses the download link as the file action and a plain anchor (no prefetch)", () => {
    expect(read("components/download-link.tsx")).toContain("تنزيل الملف");
    expect(read("components/download-link.tsx")).not.toMatch(/from ["']next\/link["']/);
    expect(read("app/(student)/courses/[courseId]/[contentItemId]/page.tsx")).toContain("DownloadLink");
  });

  it("keeps the old /read route as a redirect shim, not a viewer", () => {
    const src = read("app/(student)/read/[materialId]/page.tsx");
    expect(src).toContain('redirect("/courses")');
    expect(src).not.toMatch(/createSignedUrl|ArticleRenderer|storage_path/);
  });
});
