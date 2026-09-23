-- Rift Battle V2 reconnect/abandonment support.
-- A RUNNING authoritative match may be resumed for at most five minutes
-- since its last server-confirmed activity.
alter table public.battle_runs add column if not exists last_activity_at timestamptz;
update public.battle_runs set last_activity_at=coalesce(completed_at,created_at) where last_activity_at is null;
alter table public.battle_runs alter column last_activity_at set default timezone('utc',now());
create index if not exists battle_runs_rift_v2_active_owner_idx
  on public.battle_runs(owner_id,last_activity_at desc)
  where status='RUNNING' and formula_version='riftbattle-v2-authoritative-v1';
