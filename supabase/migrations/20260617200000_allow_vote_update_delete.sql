-- Allow updating (archive a keeper) and deleting (undo) votes for the two trusted users
create policy "votes_update" on public.votes
  for update to anon, authenticated using (true) with check (true);

create policy "votes_delete" on public.votes
  for delete to anon, authenticated using (true);
