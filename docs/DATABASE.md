# Banco de dados e segurança

## Tabelas

- `profiles`: identidade pública mínima por usuário autenticado, com username normalizado e índice único case-insensitive.
- `games`: partida, participantes, tabuleiro JSONB, turno, resultado, última jogada, sequência vencedora e heartbeats.
- `game_moves`: log ordenado e imutável de jogadas; impede número de movimento e posição duplicados por partida.
- `matchmaking_queue`: uma entrada por usuário, com heartbeat.
- `rematch_requests`: aceite de revanche por jogador e partida.

## Restrições e RLS

Coordenadas, peças, contagem, usuários distintos e estados de jogo têm constraints de banco. RLS permite que participantes leiam apenas suas partidas e jogadas. Não há políticas de escrita direta para tabuleiro, turnos, resultados ou movimentos. O perfil só pode ser atualizado pelo dono e um trigger torna id/username imutáveis.

## Funções RPC

`create_private_room`, `join_private_room`, `cancel_private_room`, `find_or_create_match`, `enter_matchmaking`, `leave_matchmaking`, `submit_game_move`, `resign_game`, `request_rematch`, `accept_rematch`, `touch_game_connection` e `handle_disconnected_player` são `security definer`, verificam `auth.uid()` e recebem apenas parâmetros mínimos. `expire_old_rooms` é reservado ao `service_role` para cron.

`submit_game_move` usa bloqueio de linha e faz validação, escrita do movimento, atualização do tabuleiro e determinação de resultado numa única transação. Isso evita condições de corrida e o cliente nunca envia vencedor, turno ou tabuleiro completo.

As migrations utilizam `extensions.gen_random_bytes` explicitamente para gerar códigos de sala. Isso é necessário no Supabase hospedado, onde `pgcrypto` é instalado no schema `extensions` e as funções RPC usam `search_path` restrito por segurança.

`submit_game_move` mantém resultado e motivo em variáveis tipadas pelos enums do banco. Isso evita coerção de enum para texto e garante que empates não recebam vencedor.

O banco deve expor uma única assinatura de `submit_game_move(uuid, smallint, smallint)`. Sobrecargas com coordenadas `integer` causam ambiguidade no PostgREST e são removidas pela migration corretiva correspondente.
