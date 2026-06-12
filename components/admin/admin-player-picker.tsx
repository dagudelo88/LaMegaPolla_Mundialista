"use client";

import { useRouter } from "next/navigation";
import { es } from "@/lib/i18n/es";

export interface AdminPlayerOption {
  id: string;
  username: string;
  totalPoints: number;
  isSubmitted: boolean;
}

interface AdminPlayerPickerProps {
  participants: AdminPlayerOption[];
  selectedId: string;
  basePath?: string;
  hashAnchor?: string;
}

export function AdminPlayerPicker({
  participants,
  selectedId,
  basePath = "/admin",
  hashAnchor = "#corregir-pronosticos",
}: AdminPlayerPickerProps) {
  const router = useRouter();

  return (
    <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-background)] p-4">
      <label htmlFor="admin-player-picker" className="block text-sm font-semibold">
        {es.admin.selectPlayer}
      </label>
      <p className="mt-1 text-sm text-[var(--color-muted-foreground)]">
        {es.admin.selectPlayerHint}
      </p>
      <select
        id="admin-player-picker"
        value={selectedId}
        onChange={(e) => {
          const id = e.target.value;
          const url = id
            ? `${basePath}?jugador=${id}${hashAnchor}`
            : `${basePath}${hashAnchor}`;
          router.push(url);
        }}
        className="mt-3 w-full max-w-md rounded-lg border border-[var(--color-border)] bg-[var(--color-background)] px-3 py-2.5 text-base font-medium"
      >
        <option value="">{es.admin.selectPlayerPlaceholder}</option>
        {participants.map((p) => (
          <option key={p.id} value={p.id}>
            @{p.username} · {p.totalPoints} pts
            {p.isSubmitted ? " · Enviado" : " · Borrador"}
          </option>
        ))}
      </select>
    </div>
  );
}
