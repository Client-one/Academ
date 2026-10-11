import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { getMaterialDownloadForStudent } from "@/lib/data/materials";
import { clientKey, rateLimit } from "@/lib/security/rate-limit";

export const dynamic = "force-dynamic";

const NO_STORE = { "Cache-Control": "no-store", "Referrer-Policy": "no-referrer" } as const;

/** One neutral answer for every "cannot download" case (no existence leak). */
function notAvailable(status = 404) {
  return new NextResponse("المادة غير متاحة.", {
    status,
    headers: { ...NO_STORE, "Content-Type": "text/plain; charset=utf-8" },
  });
}

/**
 * Student file download.
 *
 * The server re-authorizes the student (active, student role, own semester,
 * published chain) BEFORE minting a 60-second signed URL, then redirects to
 * it. The URL carries Content-Disposition: attachment, so the browser
 * downloads instead of opening the file. Storage paths and long-lived links
 * are never exposed; the bucket stays private.
 */
export async function GET(request: NextRequest, ctx: { params: Promise<{ materialId: string }> }) {
  const { materialId } = await ctx.params;
  if (!z.string().uuid().safeParse(materialId).success) return notAvailable();

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    const login = request.nextUrl.clone();
    login.pathname = "/login";
    login.search = "";
    return NextResponse.redirect(login, { headers: NO_STORE });
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, is_active, semester_id, level_id")
    .eq("id", user.id)
    .maybeSingle();
  const p = profile as { role: string; is_active: boolean; semester_id: string | null; level_id: string | null } | null;
  if (!p || p.role !== "student" || !p.is_active || !p.semester_id || !p.level_id) {
    return notAvailable();
  }

  if (!rateLimit(clientKey("download", user.id, null), 60, 60_000)) {
    return notAvailable(429);
  }

  const result = await getMaterialDownloadForStudent(supabase, materialId, p.semester_id);
  if (!result.ok) return notAvailable();

  return NextResponse.redirect(result.url, { status: 302, headers: NO_STORE });
}
