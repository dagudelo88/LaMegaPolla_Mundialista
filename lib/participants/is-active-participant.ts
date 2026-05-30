/** Active pool participant: registered, paid entry fee, not withdrawn (REGLAS §12). */
export function isActivePoolParticipant(profile: {
  invite_redeemed_at: string | null;
  entry_fee_paid?: boolean;
  withdrawn_at?: string | null;
}): boolean {
  return (
    Boolean(profile.invite_redeemed_at) &&
    profile.entry_fee_paid === true &&
    profile.withdrawn_at == null
  );
}

/** Registered but excluded from the pool (unpaid or withdrawn). */
export function isWithdrawnOrUnpaid(profile: {
  invite_redeemed_at: string | null;
  entry_fee_paid?: boolean;
  withdrawn_at?: string | null;
}): boolean {
  return Boolean(profile.invite_redeemed_at) && !isActivePoolParticipant(profile);
}
