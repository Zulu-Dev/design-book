-- Efficient undecided queue fetch for swipe deck
create or replace function public.get_undecided_mockups(batch_limit int default 30)
returns setof public.mockups
language sql
stable
security invoker
as $$
  select m.*
  from public.mockups m
  left join public.votes v on v.mockup_id = m.id
  where v.id is null
  order by m.position
  limit batch_limit;
$$;

grant execute on function public.get_undecided_mockups(int) to anon, authenticated;
