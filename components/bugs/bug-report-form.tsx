"use client";

import { useState } from "react";
import { submitBugReport } from "@/app/actions/bugs";
import { Button } from "@/components/ui/button";
import { es } from "@/lib/i18n/es";

export function BugReportForm() {
  const [message, setMessage] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const fd = new FormData(form);
    const desc = String(fd.get("description") ?? "");
    if (desc.trim().length < 10) {
      setMessage(es.bugReports.descriptionTooShort);
      return;
    }
    setPending(true);
    setMessage(null);
    try {
      await submitBugReport(desc);
      setMessage(es.bugReports.submitSuccess);
      form.reset();
    } catch (err) {
      const code = err instanceof Error ? err.message : "";
      if (code === "description_too_short") {
        setMessage(es.bugReports.descriptionTooShort);
      } else if (process.env.NODE_ENV === "development" && code) {
        setMessage(`${es.bugReports.submitError} (${code})`);
      } else {
        setMessage(es.bugReports.submitError);
      }
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <label htmlFor="description" className="block text-sm font-medium">
        {es.bugReports.formLabel}
      </label>
      <textarea
        id="description"
        name="description"
        required
        minLength={10}
        rows={4}
        className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-card)] px-3 py-2"
      />
      <Button type="submit" disabled={pending}>
        {es.bugReports.submitButton}
      </Button>
      {message && <p className="text-sm text-[var(--color-muted-foreground)]">{message}</p>}
    </form>
  );
}
