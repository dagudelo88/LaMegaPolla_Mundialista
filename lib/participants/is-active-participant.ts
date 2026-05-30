/** Supabase `.or()` filter for registered, active pool participants. */
export const ACTIVE_PARTICIPANT_OR_FILTER =
  "entry_fee_paid.eq.true,is_admin.eq.true";

/** Admin/creator accounts count as paid without manual confirmation. */
export function effectiveEntryFeePaid(profile: {
  is_admin?: boolean;
  entry_fee_paid?: boolean;
}): boolean {
  return profile.is_admin === true || profile.entry_fee_paid === true;
}

/** Active pool participant: registered, paid entry fee, not withdrawn (REGLAS §12). */
export function isActivePoolParticipant(profile: {
  invite_redeemed_at: string | null;
  is_admin?: boolean;
  entry_fee_paid?: boolean;
  withdrawn_at?: string | null;
}): boolean {
  return (
    Boolean(profile.invite_redeemed_at) &&
    effectiveEntryFeePaid(profile) &&
    profile.withdrawn_at == null
  );
}

/** Registered but excluded from the pool (unpaid or withdrawn). */
export function isWithdrawnOrUnpaid(profile: {
  invite_redeemed_at: string | null;
  is_admin?: boolean;
  entry_fee_paid?: boolean;
  withdrawn_at?: string | null;
}): boolean {
  return Boolean(profile.invite_redeemed_at) && !isActivePoolParticipant(profile);
}
