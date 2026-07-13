# Multiplayer

## Busca rápida

`find_or_create_match` serializa tentativas de um mesmo usuário com advisory lock, atualiza sua fila e escolhe outro usuário com `FOR UPDATE SKIP LOCKED`. Ao encontrar oponente, cria uma única partida, sorteia cores e remove ambas as entradas. O cliente consulta a função a cada 2,5 segundos enquanto aguarda; a função retorna uma partida existente para evitar nova inscrição depois de pareado.

## Salas privadas

Uma sala recebe código aleatório de seis caracteres e começa em `waiting`. O segundo jogador é validado, recebe cor sorteada e ativa a partida. O dono pode cancelar enquanto aguarda; `expire_old_rooms` expira salas vazias após 30 minutos.

## Eventos, estado e concorrência

O cliente assina atualizações de `games` no Realtime e sempre relê o estado persistido após uma alteração. Em caso de evento perdido, resposta atrasada, reconexão ou RPC rejeitada, a relitura substitui o estado local. As constraints em `game_moves` e a transação da RPC protegem jogadas duplicadas e simultâneas.

## Desconexão e revanche

O cliente envia heartbeat a cada 15 segundos. Enquanto estiver offline, o tabuleiro fica desabilitado. Após 120 segundos sem sinal, o participante conectado pode pedir encerramento por desconexão; o servidor é quem confere o tempo. Em uma revanche, os dois jogadores registram aceite em `rematch_requests`; somente o segundo aceite cria uma nova partida, com cores invertidas e histórico anterior preservado.
