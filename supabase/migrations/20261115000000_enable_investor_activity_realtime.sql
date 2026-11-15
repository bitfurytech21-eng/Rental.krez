-- Enable Supabase Realtime for investor-owned investment and transaction activity.
-- Existing table RLS policies continue to scope visible rows to auth.uid().
do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    if not exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime'
        and schemaname = 'public'
        and tablename = 'investments'
    ) then
      alter publication supabase_realtime add table public.investments;
    end if;

    if not exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime'
        and schemaname = 'public'
        and tablename = 'ledger_transactions'
    ) then
      alter publication supabase_realtime add table public.ledger_transactions;
    end if;
  end if;
end
$$;
