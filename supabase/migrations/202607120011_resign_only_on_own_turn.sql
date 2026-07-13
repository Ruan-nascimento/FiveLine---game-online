-- Resign only allowed on your own turn.

create or replace function public.resign_game(p_game_id uuid)
returns void language plpgsql security definer set search_path = public as $$
declare
  v_user uuid := auth.uid();
  v_game public.games;
  v_piece smallint;
  v_winner uuid;
  v_result public.game_result;
begin
  select * into v_game from public.games where id = p_game_id for update;
  if not found then raise exception 'GAME_NOT_FOUND'; end if;
  perform public.assert_game_participant(v_game, v_user);
  if v_game.status <> 'active' then raise exception 'GAME_NOT_ACTIVE'; end if;

  v_piece := case when v_game.black_player_id = v_user then 1 else 2 end;
  if v_game.current_player <> v_piece then raise exception 'NOT_YOUR_TURN'; end if;

  v_winner := case when v_piece = 1 then v_game.white_player_id else v_game.black_player_id end;
  v_result := case when v_winner = v_game.black_player_id then 'black_win' else 'white_win' end;

  update public.games set
    status = 'finished',
    winner_player_id = v_winner,
    result = v_result,
    result_reason = 'resignation',
    finished_at = now(),
    turn_deadline_at = null
  where id = p_game_id;
end;
$$;

grant execute on function public.resign_game(uuid) to authenticated;
