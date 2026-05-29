-- Canje idempotente: si ya canjeaste o el código ya es tuyo, no falla.

create or replace function public.redeem_invitation_code(p_code text, p_username text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row public.invitation_codes%rowtype;
  v_uid uuid := auth.uid();
  v_profile public.profiles%rowtype;
begin
  if v_uid is null then
    raise exception 'not_authenticated';
  end if;

  select * into v_profile from public.profiles where id = v_uid;

  if v_profile.invite_redeemed_at is not null then
    if p_username is not null
      and length(trim(p_username)) >= 3
      and (v_profile.username is null or v_profile.username = trim(p_username))
    then
      update public.profiles
      set username = coalesce(v_profile.username, trim(p_username))
      where id = v_uid;
    end if;
    return;
  end if;

  if p_username is null or length(trim(p_username)) < 3 then
    raise exception 'username_too_short';
  end if;

  select * into v_row
  from public.invitation_codes
  where upper(code) = upper(trim(p_code))
  for update;

  if not found then
    raise exception 'invalid_code';
  end if;

  if v_row.expires_at is not null and v_row.expires_at < now() then
    raise exception 'expired_code';
  end if;

  if v_row.uses_count >= v_row.max_uses then
    if v_row.redeemed_by = v_uid then
      update public.profiles
      set
        username = coalesce(username, trim(p_username)),
        invite_redeemed_at = coalesce(invite_redeemed_at, now())
      where id = v_uid;
      return;
    end if;
    raise exception 'code_exhausted';
  end if;

  if exists (
    select 1 from public.profiles
    where username = trim(p_username) and id <> v_uid
  ) then
    raise exception 'username_taken';
  end if;

  update public.profiles
  set
    username = trim(p_username),
    invite_redeemed_at = now()
  where id = v_uid;

  update public.invitation_codes
  set
    uses_count = uses_count + 1,
    redeemed_by = coalesce(redeemed_by, v_uid),
    redeemed_at = coalesce(redeemed_at, now())
  where id = v_row.id;
end;
$$;
