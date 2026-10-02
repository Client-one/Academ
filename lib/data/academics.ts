import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { logError } from "@/lib/security/logger";
import type { ContentItem, ContentMaterial, Course, Level, MaterialKind, Semester } from "@/lib/types";

type Client = SupabaseClient;

/**
 * A database error is NOT the same as "no rows": it is logged (without
 * leaking internals) and surfaced as a thrown error so the route error
 * boundary renders a proper error state instead of a fake empty page.
 */
function unwrap<T>(result: { data: T[] | null; error: { message: string } | null }, context: string): T[] {
  if (result.error) {
    logError(context, { message: result.error.message });
    throw new Error("تعذر تحميل البيانات من قاعدة البيانات.");
  }
  return result.data ?? [];
}

export async function listLevels(client: Client): Promise<Level[]> {
  const res = await client.from("levels").select("*").order("order_index");
  return unwrap(res, "levels_list_failed") as Level[];
}

export async function listSemesters(client: Client): Promise<(Semester & { level_name?: string })[]> {
  const res = await client
    .from("semesters")
    .select("*, levels(name)")
    .order("order_index");
  return unwrap(res, "semesters_list_failed").map((row: Record<string, unknown>) => {
    const levels = row.levels as { name: string } | null;
    const { levels: _l, ...semester } = row;
    return { ...(semester as unknown as Semester), level_name: levels?.name ?? "" };
  });
}

export async function listSemestersForLevel(client: Client, levelId: string): Promise<Semester[]> {
  const res = await client
    .from("semesters")
    .select("*")
    .eq("level_id", levelId)
    .order("order_index");
  return unwrap(res, "semesters_list_failed") as Semester[];
}

export async function listCoursesForSemester(client: Client, semesterId: string): Promise<Course[]> {
  const res = await client
    .from("courses")
    .select("*")
    .eq("semester_id", semesterId)
    .order("order_index");
  return unwrap(res, "courses_list_failed") as Course[];
}

export async function listContentItems(client: Client, courseId: string): Promise<ContentItem[]> {
  const res = await client
    .from("content_items")
    .select("*")
    .eq("course_id", courseId)
    .order("order_index");
  return unwrap(res, "content_items_list_failed") as ContentItem[];
}

export async function listMaterialKinds(client: Client): Promise<MaterialKind[]> {
  const res = await client.from("material_kinds").select("*").order("code");
  return unwrap(res, "material_kinds_list_failed") as MaterialKind[];
}

export async function listMaterials(client: Client, contentItemId: string): Promise<(ContentMaterial & { kind_code?: string })[]> {
  const res = await client
    .from("content_materials")
    .select("*, material_kinds(code)")
    .eq("content_item_id", contentItemId)
    .order("order_index");
  return unwrap(res, "materials_list_failed").map((row: Record<string, unknown>) => {
    const kinds = row.material_kinds as { code: string } | null;
    const { material_kinds: _k, ...material } = row;
    return { ...(material as unknown as ContentMaterial), kind_code: kinds?.code ?? "" };
  });
}

/**
 * Admin hierarchy resolver.
 *
 * The URL/client supplies candidate IDs; the DATABASE decides whether the
 * chain is coherent. Each level is validated against its parent — a forged
 * or stale ID yields null for that level and everything below it, so the
 * page renders an explicit "choose …" state instead of trusting the URL or
 * silently falling back to the first row.
 */
export interface AdminHierarchySelection {
  levelId?: string;
  semesterId?: string;
  courseId?: string;
  itemId?: string;
}

export interface AdminHierarchy {
  levels: Level[];
  semesters: Semester[];
  courses: Course[];
  items: ContentItem[];
  levelId: string | null;
  semesterId: string | null;
  courseId: string | null;
  itemId: string | null;
}

export async function resolveAdminHierarchy(
  client: Client,
  sel: AdminHierarchySelection
): Promise<AdminHierarchy> {
  const levels = await listLevels(client);
  const levelId = levels.some((l) => l.id === sel.levelId) ? sel.levelId! : null;

  const semesters = levelId ? await listSemestersForLevel(client, levelId) : [];
  const semesterId =
    levelId && semesters.some((s) => s.id === sel.semesterId) ? sel.semesterId! : null;

  const courses = semesterId ? await listCoursesForSemester(client, semesterId) : [];
  const courseId =
    semesterId && courses.some((c) => c.id === sel.courseId) ? sel.courseId! : null;

  const items = courseId ? await listContentItems(client, courseId) : [];
  const itemId = courseId && items.some((i) => i.id === sel.itemId) ? sel.itemId! : null;

  return { levels, semesters, courses, items, levelId, semesterId, courseId, itemId };
}

export async function moveItem(
  client: Client,
  input: { kind: string; id: string; delta: 1 | -1 }
): Promise<{ ok: boolean; error?: string }> {
  const { error } = await client.rpc("move_item", input);
  if (error) {
    logError("move_item_failed", { kind: input.kind, message: error.message });
    return { ok: false, error: "تعذر إعادة الترتيب." };
  }
  return { ok: true };
}
