import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";

export type InviteValidation =
  | { ok: true }
  | { ok: false; reason: "invalid" | "expired" | "exhausted" };

export async function validateInviteCode(code: string): Promise<InviteValidation> {
  const normalized = code.trim().toUpperCase();
  if (!normalized) {
    return { ok: false, reason: "invalid" };
  }

  const admin = createAdminClient();
  const { data: row, error } = await admin
    .from("invitation_codes")
    .select("expires_at, uses_count, max_uses")
    .eq("code", normalized)
    .maybeSingle();

  if (error || !row) {
    return { ok: false, reason: "invalid" };
  }

  if (row.expires_at && new Date(row.expires_at) < new Date()) {
    return { ok: false, reason: "expired" };
  }

  if (row.uses_count >= row.max_uses) {
    return { ok: false, reason: "exhausted" };
  }

  return { ok: true };
}
