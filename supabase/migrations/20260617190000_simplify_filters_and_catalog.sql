-- Simplify queue RPCs: latest-only filter + pagination, no project filter
drop function if exists public.get_undecided_mockups(int);
drop function if exists public.get_undecided_mockups(int, text, boolean);
drop function if exists public.get_queue_stats(text, boolean);
drop function if exists public.list_lot_ids();

create or replace function public.get_undecided_mockups(
  batch_limit int default 30,
  page_offset int default 0,
  latest_only boolean default false
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
    and (
      not latest_only
      or m.version is null
      or m.version = (
        select max(m2.version)
        from public.mockups m2
        where m2.lot_id is not distinct from m.lot_id
          and m2.design_id is not distinct from m.design_id
      )
    )
  order by m.position
  offset page_offset
  limit batch_limit;
$$;

create or replace function public.get_queue_stats(
  latest_only boolean default false
)
returns table (remaining bigint, keepers bigint)
language sql
stable
security invoker
as $$
  with queue as (
    select m.id
    from public.mockups m
    left join public.votes v on v.mockup_id = m.id
    where v.id is null
      and (
        not latest_only
        or m.version is null
        or m.version = (
          select max(m2.version)
          from public.mockups m2
          where m2.lot_id is not distinct from m.lot_id
            and m2.design_id is not distinct from m.design_id
        )
      )
  )
  select
    (select count(*) from queue),
    (select count(*) from public.votes where liked = true);
$$;

grant execute on function public.get_undecided_mockups(int, int, boolean) to anon, authenticated;
grant execute on function public.get_queue_stats(boolean) to anon, authenticated;
