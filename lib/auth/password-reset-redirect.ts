export const PASSWORD_UPDATE_PATH = "/actualizar-contrasena";

export function buildPasswordResetRedirectUrl(origin: string): string {
  const next = encodeURIComponent(PASSWORD_UPDATE_PATH);
  return `${origin}/auth/callback?next=${next}`;
}
