import type { SupabaseClient } from "@supabase/supabase-js";

const PAGE_SIZE = 1000;

type QueryResult<T> = { data: T[] | null; error: { message: string } | null };

/** Fetch all rows from a Supabase query, paginating past the default 1000-row limit. */
export async function fetchAllPages<T>(
  runQuery: (range: { from: number; to: number }) => PromiseLike<QueryResult<T>>
): Promise<T[]> {
  const rows: T[] = [];
  let from = 0;

  while (true) {
    const { data, error } = await runQuery({ from, to: from + PAGE_SIZE - 1 });
    if (error) throw new Error(error.message);
    const page = data ?? [];
    rows.push(...page);
    if (page.length < PAGE_SIZE) break;
    from += PAGE_SIZE;
  }

  return rows;
}

/** Convenience wrapper for simple filtered table reads. */
export async function fetchAllFromTable<T extends Record<string, unknown>>(
  admin: SupabaseClient,
  table: string,
  select: string,
  applyFilters: (
    query: ReturnType<SupabaseClient["from"]>
  ) => ReturnType<SupabaseClient["from"]>
): Promise<T[]> {
  return fetchAllPages<T>((range) =>
    applyFilters(admin.from(table).select(select)).range(range.from, range.to)
  );
}
