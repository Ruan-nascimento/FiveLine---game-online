-- Fix rematch: 20s window, shared exit to lobby, random colors, notify both players of new game.

alter table public.games
  add column if not exists rematch_game_id uuid references public.games(id) on delete set null,
  add column if not exists rematch_declined_at timestamptz,
  add column if not exists rematch_of uuid references public.games(id) on delete set null;

create or replace function public.request_rematch(p_game_id uuid)
returns uuid language plpgsql security definer set search_path = public as $$
declare
  v_user uuid := auth.uid();
  v_game public.games;
  v_count integer;
  v_new_game uuid;
  v_black uuid;
  v_white uuid;
begin
  select * into v_game from public.games where id = p_game_id for update;
  if not found then raise exception 'GAME_NOT_FOUND'; end if;
  perform public.assert_game_participant(v_game, v_user);
  if v_game.status <> 'finished' then raise exception 'REMATCH_NOT_AVAILABLE'; end if;
  if v_game.rematch_declined_at is not null then raise exception 'REMATCH_DECLINED'; end if;
  if v_game.rematch_game_id is not null then return v_game.rematch_game_id; end if;
  if v_game.finished_at is null or v_game.finished_at < now() - interval '20 seconds' then
    raise exception 'REMATCH_EXPIRED';
  end if;

  insert into public.rematch_requests (game_id, player_id)
  values (p_game_id, v_user)
  on conflict do nothing;

  select count(*) into v_count from public.rematch_requests where game_id = p_game_id;
  if v_count < 2 then return null; end if;

  if random() < 0.5 then
    v_black := v_game.black_player_id;
    v_white := v_game.white_player_id;
  else
    v_black := v_game.white_player_id;
    v_white := v_game.black_player_id;
  end if;

  insert into public.games (
    mode, visibility, status, black_player_id, white_player_id, current_player, board,
    started_at, black_last_seen_at, white_last_seen_at, turn_deadline_at, rematch_of
  )
  values (
    v_game.mode, v_game.visibility, 'active', v_black, v_white, 1, public.gomoku_empty_board(),
    now(), now(), now(), now() + interval '30 seconds', p_game_id
  )
  returning id into v_new_game;

  update public.games set rematch_game_id = v_new_game where id = p_game_id;
  delete from public.rematch_requests where game_id = p_game_id;
  return v_new_game;
end;
$$;

create or replace function public.decline_rematch(p_game_id uuid)
returns void language plpgsql security definer set search_path = public as $$
declare
  v_user uuid := auth.uid();
  v_game public.games;
begin
  select * into v_game from public.games where id = p_game_id for update;
  if not found then raise exception 'GAME_NOT_FOUND'; end if;
  perform public.assert_game_participant(v_game, v_user);
  if v_game.status <> 'finished' then return; end if;
  if v_game.rematch_game_id is not null then return; end if;
  update public.games
    set rematch_declined_at = coalesce(rematch_declined_at, now())
  where id = p_game_id;
  delete from public.rematch_requests where game_id = p_game_id;
end;
$$;

create or replace function public.accept_rematch(p_game_id uuid)
returns uuid language sql security definer set search_path = public as $$
  select public.request_rematch(p_game_id);
$$;

revoke all on function public.decline_rematch(uuid) from public;
grant execute on function public.decline_rematch(uuid) to authenticated;
grant execute on function public.request_rematch(uuid), public.accept_rematch(uuid) to authenticated;
