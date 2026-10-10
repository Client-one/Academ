import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Safe `order_index` allocation for ordered lists (e.g. materials of one
 * content item).
 *
 * `order_index` is NOT NULL with no default, and each list has a UNIQUE
 * (parent, order_index) constraint. Allocation is therefore optimistic:
 *   1. read the current max for the parent (admin session + RLS),
 *   2. insert with max + 1,
 *   3. if a concurrent writer took the same slot, PostgreSQL rejects the
 *      insert with 23505 on the *_order_uq constraint — we re-read and retry.
 * The unique constraint (not this code) is what guarantees no duplicates;
 * the retry only removes the spurious failure. Any other error is returned
 * untouched, never retried.
 */

export interface DbError {
  code?: string;
  message: string;
}

const MAX_ATTEMPTS = 5;

export function isOrderConflict(error: DbError | null | undefined): boolean {
  return !!error && error.code === "23505" && /_order_uq\b/.test(error.message);
}

export async function nextOrderIndex(
  client: SupabaseClient,
  table: string,
  parentColumn: string,
  parentId: string
): Promise<{ ok: true; value: number } | { ok: false; error: DbError }> {
  const { data, error } = await client
    .from(table)
    .select("order_index")
    .eq(parentColumn, parentId)
    .order("order_index", { ascending: false })
    .limit(1);
  if (error) return { ok: false, error };
  const max = (data?.[0] as { order_index: number } | undefined)?.order_index ?? 0;
  return { ok: true, value: max + 1 };
}

export async function insertWithNextOrderIndex<T>(params: {
  client: SupabaseClient;
  table: string;
  parentColumn: string;
  parentId: string;
  /** Builds the row for a candidate order_index and performs the insert. */
  insert: (orderIndex: number) => PromiseLike<{ data: T | null; error: DbError | null }>;
  maxAttempts?: number;
}): Promise<{ data: T | null; error: DbError | null; attempts: number }> {
  const limit = params.maxAttempts ?? MAX_ATTEMPTS;
  let last: { data: T | null; error: DbError | null } = { data: null, error: null };

  for (let attempt = 1; attempt <= limit; attempt++) {
    const next = await nextOrderIndex(params.client, params.table, params.parentColumn, params.parentId);
    if (!next.ok) return { data: null, error: next.error, attempts: attempt };

    last = await params.insert(next.value);
    if (!last.error) return { ...last, attempts: attempt };
    if (!isOrderConflict(last.error)) return { ...last, attempts: attempt };
    // Order slot lost to a concurrent insert: brief jittered pause, then re-read.
    await new Promise((r) => setTimeout(r, 10 + Math.floor(Math.random() * 40)));
  }
  return { ...last, attempts: limit };
}
