"use server";

import { type BugReportStatus, isBugReportStatus } from "@/lib/bugs/types";
import { requireAdmin } from "@/lib/auth/require-admin";
import { createAdminClient } from "@/lib/supabase/admin";
import { revalidatePath } from "next/cache";

export async function updateBugReportStatus(
  reportId: string,
  status: BugReportStatus,
  adminNote?: string
) {
  if (!isBugReportStatus(status)) {
    throw new Error("invalid_status");
  }

  const trimmedNote = adminNote?.trim() ?? "";
  if (status === "resolved" && trimmedNote.length < 10) {
    throw new Error("admin_note_required");
  }

  const { user } = await requireAdmin();
  const admin = createAdminClient();

  const { data: existing, error: fetchErr } = await admin
    .from("bug_reports")
    .select("id, status, admin_note, user_id, description")
    .eq("id", reportId)
    .maybeSingle();

  if (fetchErr || !existing) {
    throw new Error(fetchErr?.message ?? "report_not_found");
  }

  const updatePayload: {
    status: BugReportStatus;
    updated_at: string;
    admin_note?: string | null;
  } = {
    status,
    updated_at: new Date().toISOString(),
  };

  if (trimmedNote.length > 0) {
    updatePayload.admin_note = trimmedNote;
  } else if (status === "closed") {
    updatePayload.admin_note = existing.admin_note;
  }

  const { error: updateErr } = await admin
    .from("bug_reports")
    .update(updatePayload)
    .eq("id", reportId);

  if (updateErr) throw new Error(updateErr.message);

  await admin.from("admin_actions").insert({
    admin_id: user.id,
    action: "update_bug_report",
    target_type: "bug_reports",
    target_id: reportId,
    details: {
      previousStatus: existing.status,
      newStatus: status,
      userId: existing.user_id,
      adminNote: updatePayload.admin_note ?? existing.admin_note,
    },
  });

  revalidatePath("/admin/reportes");
  revalidatePath("/admin");
  revalidatePath("/dashboard");
}
