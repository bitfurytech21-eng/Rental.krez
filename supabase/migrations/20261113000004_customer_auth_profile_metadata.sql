-- Ensure public Supabase sign-ups persist the profile metadata accepted by the API.
begin;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_full_name text;
  v_country text;
  v_country_code text;
  v_phone text;
begin
  v_full_name := coalesce(nullif(trim(new.raw_user_meta_data->>'full_name'), ''), split_part(new.email, '@', 1));
  v_country := coalesce(nullif(trim(new.raw_user_meta_data->>'country'), ''), 'France');
  v_country_code := nullif(upper(trim(new.raw_user_meta_data->>'country_code')), '');
  v_phone := coalesce(nullif(trim(new.raw_user_meta_data->>'phone_number'), ''), '');

  -- Public signups always receive the least-privilege investor profile and zero balances.
  insert into public.user_profiles (
    id, email, full_name, country, country_code, phone_number,
    account_type, wallet_balance, invested_balance, kyc_status
  ) values (
    new.id, new.email, v_full_name, v_country, v_country_code, v_phone,
    'individual_investor', 0.00, 0.00, 'pending'
  );

  insert into public.user_roles (user_id, role)
  values (new.id, 'investor')
  on conflict do nothing;

  return new;
end;
$$;

commit;
