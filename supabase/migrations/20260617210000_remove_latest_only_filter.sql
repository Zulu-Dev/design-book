-- Remove the latest-version-only filter entirely; catalog shows all undecided mockups in order.
-- Use keyset pagination by position so archiving items mid-scroll never skips entries.
drop function if exists public.get_undecided_mockups(int, int, boolean);
drop function if exists public.get_undecided_mockups(int, int);
drop function if exists public.get_queue_stats(boolean);

create or replace function public.get_undecided_mockups(
  batch_limit int default 30,
  after_position int default -1
)
returns setof public.mockups
language sql
stable
security invoker
as $$
  select m.*
  from public.mockups m
  left join public.votes v on v.mockup_id = m.id
  where v.id is null
    and m.position > after_position
  order by m.position
  limit batch_limit;
$$;

create or replace function public.get_queue_stats()
returns table (remaining bigint, keepers bigint)
language sql
stable
security invoker
as $$
  select
    (
      select count(*)
      from public.mockups m
      left join public.votes v on v.mockup_id = m.id
      where v.id is null
    ),
    (select count(*) from public.votes where liked = true);
$$;

grant execute on function public.get_undecided_mockups(int, int) to anon, authenticated;
grant execute on function public.get_queue_stats() to anon, authenticated;
