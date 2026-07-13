-- Allow signed-in players to browse finished games and public profiles history.

create policy "authenticated read finished games"
  on public.games
  for select
  to authenticated
  using (status = 'finished');

create policy "authenticated read moves of finished games"
  on public.game_moves
  for select
  to authenticated
  using (
    exists (
      select 1 from public.games
      where games.id = game_moves.game_id
        and games.status = 'finished'
    )
  );
