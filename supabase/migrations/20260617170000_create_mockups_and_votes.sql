-- Mockups imported from CSV
create table public.mockups (
  id uuid primary key default gen_random_uuid(),
  url text not null unique,
  filename text not null,
  design_id text,
  version int,
  position int not null,
  created_at timestamptz not null default now()
);

create index mockups_position_idx on public.mockups (position);
create index mockups_design_id_idx on public.mockups (design_id);

-- One vote per mockup; first swipe wins
create table public.votes (
  id uuid primary key default gen_random_uuid(),
  mockup_id uuid not null references public.mockups (id) on delete cascade,
  voter text not null check (voter in ('Ryan', 'Jackson')),
  liked boolean not null,
  created_at timestamptz not null default now(),
  unique (mockup_id)
);

create index votes_liked_idx on public.votes (liked) where liked = true;
create index votes_voter_idx on public.votes (voter);

-- RLS: open read/insert for anon (trusted small team, no auth)
alter table public.mockups enable row level security;
alter table public.votes enable row level security;

create policy "mockups_select" on public.mockups
  for select to anon, authenticated using (true);

create policy "votes_select" on public.votes
  for select to anon, authenticated using (true);

create policy "votes_insert" on public.votes
  for insert to anon, authenticated with check (true);

create policy "mockups_insert" on public.mockups
  for insert to anon, authenticated with check (true);

-- Realtime for live deck sync
alter publication supabase_realtime add table public.votes;
