import { cache } from "react";
import { createClient } from "@/lib/supabase/server";

export type AppProfile = {
  id: string;
  role: string;
  is_admin: boolean;
  username: string | null;
  total_points: number;
  invite_redeemed_at: string | null;
  entry_fee_paid?: boolean;
  withdrawn_at?: string | null;
};

export const getProfile = cache(async (userId: string): Promise<AppProfile | null> => {
  const supabase = await createClient();

  const { data: rpcRows, error: rpcError } = await supabase.rpc("get_my_profile");

  if (!rpcError && rpcRows?.length) {
    const row = rpcRows[0] as AppProfile;
    if (row.id === userId) return row;
  }

  const { data, error } = await supabase
    .from("profiles")
    .select(
      "id, role, is_admin, username, total_points, invite_redeemed_at, entry_fee_paid, withdrawn_at"
    )
    .eq("id", userId)
    .maybeSingle();

  if (error) {
    console.error("[getProfile]", error.message);
    return null;
  }

  return data as AppProfile | null;
});
