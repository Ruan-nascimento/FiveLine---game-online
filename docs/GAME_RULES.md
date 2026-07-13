# Regras do jogo

O FiveLine usa um tabuleiro 15 × 15, com coordenadas internas de `0` a `14`. Cada posição é vazia (`0`), preta (`1`) ou branca (`2`).

As pretas começam. Em cada turno o jogador coloca exatamente uma peça em uma célula vazia; peças colocadas não se movem. Não é permitido jogar fora do tabuleiro, em célula ocupada, fora do turno ou após o fim da partida. Em partidas online, cada turno tem limite de tempo: se o tempo acaba, o jogador perde a vez e o turno passa para o adversário.

Vence quem formar uma linha contínua de cinco ou mais peças da mesma cor na horizontal, vertical, diagonal principal ou diagonal inversa. A verificação parte da última jogada e retorna toda a sequência para destaque visual. Há empate quando as 225 células são ocupadas sem vencedor.

Contra IA, a pessoa escolhe dificuldade e peças pretas, brancas ou aleatórias. Em partidas online, a cor é distribuída aleatoriamente; em uma revanche, a ordem de início também é aleatória. A partida online usa o banco para validar todas essas regras.
