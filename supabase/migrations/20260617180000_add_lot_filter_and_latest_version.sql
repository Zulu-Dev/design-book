-- Project/lot id from filename prefix (e.g. L24232)
alter table public.mockups add column if not exists lot_id text;

update public.mockups
set lot_id = (regexp_match(filename, '(L\d+)', 'i'))[1]
where lot_id is null;

create index if not exists mockups_lot_id_idx on public.mockups (lot_id);

drop function if exists public.get_undecided_mockups(int);

create or replace function public.get_undecided_mockups(
  batch_limit int default 30,
  lot_filter text default null,
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
    and (lot_filter is null or m.lot_id = lot_filter)
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
  limit batch_limit;
$$;

create or replace function public.get_queue_stats(
  lot_filter text default null,
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
      and (lot_filter is null or m.lot_id = lot_filter)
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

create or replace function public.list_lot_ids()
returns table (lot_id text, mockup_count bigint, undecided_count bigint)
language sql
stable
security invoker
as $$
  select
    m.lot_id,
    count(*) as mockup_count,
    count(*) filter (where v.id is null) as undecided_count
  from public.mockups m
  left join public.votes v on v.mockup_id = m.id
  where m.lot_id is not null
  group by m.lot_id
  order by m.lot_id desc;
$$;

grant execute on function public.get_undecided_mockups(int, text, boolean) to anon, authenticated;
grant execute on function public.get_queue_stats(text, boolean) to anon, authenticated;
grant execute on function public.list_lot_ids() to anon, authenticated;
