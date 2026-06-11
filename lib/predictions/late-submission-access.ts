import "server-only";

import { getConfig } from "@/lib/config/get-config";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { isLateSubmissionWindowOpen } from "@/lib/predictions/global-deadline";

export type LateSubmissionUsersMap = Record<string, string>;

export async function getLateSubmissionUsersMap(): Promise<LateSubmissionUsersMap> {
  const raw = await getConfig<LateSubmissionUsersMap>("late_submission.users");
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return {};
  return raw;
}

function pickActiveUntil(until: string | null | undefined): string | null {
  if (!until || !isLateSubmissionWindowOpen(until)) return null;
  return until;
}

export async function getUserLateSubmissionUntil(userId: string): Promise<string | null> {
  const supabase = await createClient();
  const { data: profile, error } = await supabase
    .from("profiles")
    .select("late_submission_until")
    .eq("id", userId)
    .maybeSingle();

  if (!error) {
    const fromProfile = pickActiveUntil(profile?.late_submission_until);
    if (fromProfile) return fromProfile;
  }

  const map = await getLateSubmissionUsersMap();
  return pickActiveUntil(map[userId] ?? null);
}

export async function grantLateSubmissionAccess(
  userId: string,
  untilIso: string
): Promise<LateSubmissionUsersMap> {
  const admin = createAdminClient();
  const current = await getLateSubmissionUsersMap();
  const next = { ...current, [userId]: untilIso };

  const { error } = await admin.from("app_config").upsert(
    {
      key: "late_submission.users",
      value: next,
      description: "Per-user extensions to save/submit predictions after the global deadline.",
    },
    { onConflict: "key" }
  );

  if (error) throw new Error(error.message);
  return next;
}
