-- ============================================================
-- MIGRATION 012 — Remove prospect RPC
-- Adds decrement_prospect_counts function used by DELETE /api/prospects/[id]
-- Safe to re-run (CREATE OR REPLACE).
-- ============================================================

create or replace function public.decrement_prospect_counts(
  p_list_id uuid,
  p_score   text
)
returns void
language plpgsql
security definer
as $$
begin
  update public.prospect_lists
  set
    total_prospects = greatest(0, total_prospects - 1),
    hot_count       = greatest(0, hot_count  - case when p_score = 'hot'  then 1 else 0 end),
    warm_count      = greatest(0, warm_count - case when p_score = 'warm' then 1 else 0 end),
    cold_count      = greatest(0, cold_count - case when p_score = 'cold' then 1 else 0 end)
  where id = p_list_id;
end;
$$;
