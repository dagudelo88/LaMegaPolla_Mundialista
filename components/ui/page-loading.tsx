import { es } from "@/lib/i18n/es";

export function PageLoading() {
  return (
    <div className="flex min-h-[40vh] flex-col items-center justify-center gap-3">
      <div
        className="size-8 animate-spin rounded-full border-2 border-[var(--color-border)] border-t-[var(--color-accent)]"
        aria-hidden
      />
      <p className="text-sm text-[var(--color-muted-foreground)]">{es.common.loading}</p>
    </div>
  );
}
