export const BUG_REPORT_STATUSES = ["open", "reviewing", "resolved", "closed"] as const;

export type BugReportStatus = (typeof BUG_REPORT_STATUSES)[number];

export function isBugReportStatus(value: string): value is BugReportStatus {
  return (BUG_REPORT_STATUSES as readonly string[]).includes(value);
}

export interface BugReportRow {
  id: string;
  user_id: string;
  description: string;
  status: BugReportStatus;
  admin_note: string | null;
  created_at: string;
  updated_at: string;
  username: string | null;
}
