import type { SupabaseClient } from "@supabase/supabase-js";

export interface AdminParticipantRow {
  id: string;
  username: string | null;
  email: string | null;
  role: string;
  is_admin: boolean;
  invite_redeemed_at: string | null;
  total_points: number;
  entry_fee_paid: boolean;
  withdrawn_at: string | null;
  joined_at: string;
}

export function isRegisteredParticipant(row: AdminParticipantRow): boolean {
  return Boolean(row.username && row.invite_redeemed_at);
}

async function loadAuthEmails(admin: SupabaseClient): Promise<Map<string, string>> {
  const emailById = new Map<string, string>();
  let page = 1;
  const perPage = 200;

  while (true) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage });
    if (error) throw new Error(error.message);

    for (const user of data.users) {
      if (user.email) emailById.set(user.id, user.email);
    }

    if (data.users.length < perPage) break;
    page += 1;
  }

  return emailById;
}

export async function loadAdminParticipants(
  admin: SupabaseClient
): Promise<AdminParticipantRow[]> {
  const [{ data: profiles, error }, emailById] = await Promise.all([
    admin
      .from("profiles")
      .select(
        "id, username, role, is_admin, invite_redeemed_at, total_points, joined_at, entry_fee_paid, withdrawn_at"
      )
      .order("joined_at", { ascending: true }),
    loadAuthEmails(admin),
  ]);

  if (error) throw new Error(error.message);

  return (profiles ?? []).map((profile) => ({
    ...profile,
    email: emailById.get(profile.id) ?? null,
  }));
}
