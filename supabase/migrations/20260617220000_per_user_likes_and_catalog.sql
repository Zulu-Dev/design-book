-- Move to per-user likes: each person can like a mockup independently.
-- A like from either person makes it a keeper.

-- Drop the old "one vote per mockup" constraint and stale archive rows from the
-- previous implied-archive model (liked = false no longer has meaning).
alter table public.votes drop constraint if exists votes_mockup_id_key;
delete from public.votes where liked = false;

-- One like row per (mockup, voter); supports upsert on conflict.
create unique index if not exists votes_mockup_voter_key
  on public.votes (mockup_id, voter);

-- Full old-row payloads on delete so realtime unlikes carry mockup_id + voter.
alter table public.votes replica identity full;

-- Catalog: every mockup in order, with who has liked it.
drop function if exists public.get_undecided_mockups(int, int);

create or replace function public.get_catalog_mockups(
  batch_limit int default 60,
  after_position int default -1
)
returns table (
  id uuid,
  url text,
  filename text,
  lot_id text,
  design_id text,
  version int,
  "position" int,
  created_at timestamptz,
  liked_by_ryan boolean,
  liked_by_jackson boolean
)
language sql
stable
security invoker
as $$
  select
    m.id,
    m.url,
    m.filename,
    m.lot_id,
    m.design_id,
    m.version,
    m.position,
    m.created_at,
    coalesce(bool_or(v.voter = 'Ryan' and v.liked), false) as liked_by_ryan,
    coalesce(bool_or(v.voter = 'Jackson' and v.liked), false) as liked_by_jackson
  from public.mockups m
  left join public.votes v on v.mockup_id = m.id
  where m.position > after_position
  group by m.id
  order by m.position
  limit batch_limit;
$$;

-- Resume point: highest-position mockup the viewer has liked (0 if none).
create or replace function public.get_resume_position(viewer text)
returns int
language sql
stable
security invoker
as $$
  select coalesce(max(m.position), 0)
  from public.votes v
  join public.mockups m on m.id = v.mockup_id
  where v.liked = true and v.voter = viewer;
$$;

-- Stats: total designs + distinct keepers (liked by anyone).
drop function if exists public.get_queue_stats();

create or replace function public.get_queue_stats()
returns table (total bigint, keepers bigint)
language sql
stable
security invoker
as $$
  select
    (select count(*) from public.mockups),
    (select count(distinct mockup_id) from public.votes where liked = true);
$$;

grant execute on function public.get_catalog_mockups(int, int) to anon, authenticated;
grant execute on function public.get_resume_position(text) to anon, authenticated;
grant execute on function public.get_queue_stats() to anon, authenticated;
