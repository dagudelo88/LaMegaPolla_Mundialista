import "server-only";

import type { BugReportRow, BugReportStatus } from "@/lib/bugs/types";
import { isBugReportStatus } from "@/lib/bugs/types";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

type BugReportDbRow = {
  id: string;
  user_id: string;
  description: string;
  status: string;
  admin_note: string | null;
  created_at: string;
  updated_at: string;
  profiles: { username: string | null } | { username: string | null }[] | null;
};

function resolveUsername(
  profiles: BugReportDbRow["profiles"]
): string | null {
  if (!profiles) return null;
  if (Array.isArray(profiles)) return profiles[0]?.username ?? null;
  return profiles.username ?? null;
}

function mapBugReport(row: BugReportDbRow): BugReportRow {
  const status = isBugReportStatus(row.status) ? row.status : "open";
  return {
    id: row.id,
    user_id: row.user_id,
    description: row.description,
    status,
    admin_note: row.admin_note,
    created_at: row.created_at,
    updated_at: row.updated_at,
    username: resolveUsername(row.profiles),
  };
}

export async function loadAdminBugReports(statusFilter?: BugReportStatus | "all") {
  const admin = createAdminClient();
  let query = admin
    .from("bug_reports")
    .select(
      "id, user_id, description, status, admin_note, created_at, updated_at, profiles!bug_reports_user_id_fkey(username)"
    )
    .order("created_at", { ascending: false });

  if (statusFilter && statusFilter !== "all") {
    query = query.eq("status", statusFilter);
  }

  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return (data ?? []).map((row) => mapBugReport(row as BugReportDbRow));
}

export async function countOpenBugReports(): Promise<number> {
  const admin = createAdminClient();
  const { count, error } = await admin
    .from("bug_reports")
    .select("*", { count: "exact", head: true })
    .eq("status", "open");

  if (error) throw new Error(error.message);
  return count ?? 0;
}

export async function loadUserBugReports(userId: string): Promise<BugReportRow[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("bug_reports")
    .select(
      "id, user_id, description, status, admin_note, created_at, updated_at, profiles!bug_reports_user_id_fkey(username)"
    )
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(10);

  if (error) throw new Error(error.message);
  return (data ?? []).map((row) => mapBugReport(row as BugReportDbRow));
}
