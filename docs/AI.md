# Inteligência artificial

Todos os níveis entendem regras e retornam somente células vazias. A primeira jogada prioriza o centro; nas demais, a geração de candidatos limita a busca às posições vazias próximas de peças existentes.

- **Fácil:** vence quando possível, mas escolhe com aleatoriedade controlada entre boas opções e pode deixar de bloquear.
- **Médio:** sempre considera vitória e bloqueio imediatos, depois escolhe pela avaliação de ataque, defesa e centro.
- **Difícil:** além dessas prioridades, ordena candidatos e usa Negamax com poda alpha-beta curta e limite de 900 ms.

A avaliação pontua sequências contínuas de duas a cinco, peso defensivo e proximidade do centro. A busca pesada roda em `ai.worker.ts`; a interface mantém um atraso mínimo discreto. Se o Worker falhar, `getFallbackMove` busca vitória, bloqueio ou o melhor candidato sem travar a partida.

Melhorias futuras possíveis: tabela de transposição persistente por busca, detecção mais completa de padrões abertos/fechados e profundidade adaptativa por dispositivo.
