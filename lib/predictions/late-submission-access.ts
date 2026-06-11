import "server-only";

import { CACHE_TAGS } from "@/lib/cache/tags";
import { getConfig } from "@/lib/config/get-config";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { isLateSubmissionWindowOpen } from "@/lib/predictions/global-deadline";
import { revalidateTag } from "next/cache";

export type LateSubmissionUsersMap = Record<string, string>;

export const LATE_SUBMISSION_USERS_KEY = "late_submission.users";
export const LATE_SUBMISSION_REGISTRATIONS_UNTIL_KEY =
  "late_submission.registrations_until";

function normalizeConfigIso(raw: unknown): string | null {
  if (raw == null) return null;
  if (typeof raw === "string") return raw.replace(/^"|"$/g, "");
  return String(raw);
}

function pickActiveUntil(until: string | null | undefined): string | null {
  if (!until || !isLateSubmissionWindowOpen(until)) return null;
  return until;
}

export async function getLateSubmissionUsersMap(): Promise<LateSubmissionUsersMap> {
  const raw = await getConfig<LateSubmissionUsersMap>(LATE_SUBMISSION_USERS_KEY);
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return {};
  return raw;
}

export async function getRegistrationLateSubmissionUntil(): Promise<string | null> {
  const raw = await getConfig<string>(LATE_SUBMISSION_REGISTRATIONS_UNTIL_KEY);
  return pickActiveUntil(normalizeConfigIso(raw));
}

async function userHasSubmitted(userId: string): Promise<boolean> {
  const supabase = await createClient();
  const { data: submission } = await supabase
    .from("user_tournament_submissions")
    .select("is_complete")
    .eq("user_id", userId)
    .maybeSingle();
  return submission?.is_complete ?? false;
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
  const fromUserMap = pickActiveUntil(map[userId] ?? null);
  if (fromUserMap) return fromUserMap;

  const registrationUntil = await getRegistrationLateSubmissionUntil();
  if (!registrationUntil) return null;
  if (await userHasSubmitted(userId)) return null;
  return registrationUntil;
}

async function revalidateLateSubmissionConfig() {
  revalidateTag(CACHE_TAGS.appConfig);
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
      key: LATE_SUBMISSION_USERS_KEY,
      value: next,
      description: "Per-user extensions to save/submit predictions after the global deadline.",
    },
    { onConflict: "key" }
  );

  if (error) throw new Error(error.message);
  await revalidateLateSubmissionConfig();
  return next;
}

export async function setRegistrationLateSubmissionUntil(
  untilIso: string
): Promise<string> {
  const admin = createAdminClient();
  const { error } = await admin.from("app_config").upsert(
    {
      key: LATE_SUBMISSION_REGISTRATIONS_UNTIL_KEY,
      value: untilIso,
      description:
        "New registrations without a submitted poll may save/submit until this instant (ISO UTC).",
    },
    { onConflict: "key" }
  );

  if (error) throw new Error(error.message);
  await revalidateLateSubmissionConfig();
  return untilIso;
}

/** Grant the active registration late window to a user who just joined. */
export async function grantLateSubmissionOnRegistration(userId: string): Promise<void> {
  const until = await getRegistrationLateSubmissionUntil();
  if (!until) return;
  await grantLateSubmissionAccess(userId, until);
}
