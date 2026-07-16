const PAGE_SIZE = 1000;

type QueryResult<T> = { data: T[] | null; error: { message: string } | null };

/**
 * Fetch all rows from a Supabase query, paginating past the default 1000-row limit.
 * Callers MUST apply a stable `.order(...)` (e.g. `.order("id")`) before `.range`,
 * otherwise pages can skip or duplicate rows.
 */
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
