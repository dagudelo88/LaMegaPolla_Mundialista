-- Admin/creator accounts are always treated as paid in the pool.

update public.profiles
set entry_fee_paid = true
where is_admin = true
  and withdrawn_at is null;
