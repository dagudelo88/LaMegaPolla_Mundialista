import type { SupabaseClient } from "@supabase/supabase-js";

export interface InviteCodeRow {
  code: string;
  uses_count: number;
  max_uses: number;
}

export function isInviteCodeUsed(row: Pick<InviteCodeRow, "uses_count" | "max_uses">): boolean {
  return row.uses_count >= row.max_uses;
}

export interface InviteCodesSummary {
  totalGenerated: number;
  totalUsed: number;
  available: InviteCodeRow[];
  used: InviteCodeRow[];
}

export async function loadInviteCodesSummary(
  admin: SupabaseClient
): Promise<InviteCodesSummary> {
  const { data, error } = await admin
    .from("invitation_codes")
    .select("code, uses_count, max_uses")
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);

  const rows = (data ?? []) as InviteCodeRow[];
  const used = rows.filter(isInviteCodeUsed);
  const available = rows.filter((row) => !isInviteCodeUsed(row));

  return {
    totalGenerated: rows.length,
    totalUsed: used.length,
    available,
    used,
  };
}
