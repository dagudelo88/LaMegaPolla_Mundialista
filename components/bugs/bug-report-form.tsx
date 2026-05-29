"use client";

import { useState } from "react";
import { submitBugReport } from "@/app/actions/bugs";
import { Button } from "@/components/ui/button";

export function BugReportForm() {
  const [message, setMessage] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const desc = String(fd.get("description") ?? "");
    if (desc.length < 10) return;
    setPending(true);
    try {
      await submitBugReport(desc);
      setMessage("Reporte enviado. El administrador lo revisará.");
      e.currentTarget.reset();
    } catch {
      setMessage("No se pudo enviar el reporte.");
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <label htmlFor="description" className="block text-sm font-medium">
        Describe el problema (REGLAS §10)
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
        Enviar reporte
      </Button>
      {message && <p className="text-sm text-[var(--color-muted-foreground)]">{message}</p>}
    </form>
  );
}
