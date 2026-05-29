/** Perfil con rol de jugador y/o administrador (pueden coexistir). */
export type ProfileRoles = {
  role?: string | null;
  is_admin?: boolean | null;
  invite_redeemed_at?: string | null;
};

/** Acceso al panel /admin y acciones de administración. */
export function isAdminProfile(profile: ProfileRoles | null | undefined): boolean {
  if (!profile) return false;
  return profile.is_admin === true || profile.role === "admin";
}

/** Participa en la polla (pronósticos, puntos, leaderboard). */
export function isPlayerProfile(profile: ProfileRoles | null | undefined): boolean {
  if (!profile) return false;
  return Boolean(profile.invite_redeemed_at);
}

export function formatProfileRoles(profile: ProfileRoles | null | undefined): string {
  const admin = isAdminProfile(profile);
  const player = isPlayerProfile(profile);
  if (admin && player) return "Administrador · Jugador";
  if (admin) return "Administrador";
  if (player) return "Jugador";
  return "Pendiente de invitación";
}
