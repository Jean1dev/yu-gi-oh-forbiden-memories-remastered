# Plano de Implementação — Pontuação e Nota do Duelo

> Spec: `./spec.md`

## Pré-requisitos

- `rating-engine/F01` implementado — os sete contadores por jogador existem no estado e no snapshot.
  Sem eles, sete dos dez parâmetros da fórmula não têm fonte.
- `motor-duelo-1x1` F05 e F12 implementados — o snapshot e o desfecho com vencedor e motivo já
  existem.
- `free-duel/F05` implementado — `RatingEngine`, `RatingEvaluation` e `RatingReward` já existem em
  `packages/shared`; esta feature os estreita, não os cria.
- `rating-engine/F03` **não** existe ainda: a composição `evaluateDuel` depende de `rewardForGrade`.
  A pontuação e a escada de notas são independentes e podem ser implementadas e testadas antes; a
  composição fecha quando F03 chegar.
- A fórmula **não** é dado pendente: foi transcrita do jogo original e conferida por duas fontes que
  se validam por aritmética (spec, Seção 3 "Proveniência"). Nenhum coeficiente é inventado.

## Fase 1: Estreitar o contrato de nota

**1. Lista fechada de notas** — Acrescentar aos constantes do duelo a lista das dez notas da escala,
no mesmo padrão do vocabulário de eventos, e fazer o tipo de nota derivar dela em vez de ser uma
string livre.

**2. Assinatura do motor de avaliação** — Ajustar o contrato do Rating Engine para receber também o
jogador avaliado e devolver a avaliação tipada em vez de um resultado opaco, e ajustar o schema zod
da nota de string livre para enum fechado.

## Fase 2: A fórmula

**3. Tabelas de coeficientes** — Criar o módulo das tabelas do jogo original com a base, os dez
parâmetros e os pontos por tipo de vitória, como constantes congeladas, com a proveniência e a
conferência aritmética registradas no cabeçalho.

**4. Pontuação** — Criar a função pura de pontuação que soma a base, a contribuição de cada
parâmetro por limiar e os pontos do tipo de vitória. Total para qualquer contador inteiro não
negativo, saturando nas duas pontas.

**5. Escada de notas** — Criar a função pura que mapeia a pontuação para uma das dez notas, em
faixas de dez pontos, saturando nos extremos.

## Fase 3: Composição e cobertura

**6. Avaliação do duelo** — Criar a função que valida o snapshot (desfecho presente, jogador
vencedor, motivo pontuável, contadores presentes), extrai os dez parâmetros do estado final, compõe
pontuação, nota e recompensa, e devolve a avaliação ou um erro de domínio. Nenhum ramo de falha
assume contadores zerados. Exportar o subsistema pelo índice do pacote.

**7. Verificação da transcrição** — Cobrir os limites teóricos mínimo e máximo da pontuação e a
forma das tabelas. São estes testes que distinguem transcrição de invenção e que pegam um dígito
errado.

**8. Unitários da fórmula e da escada** — Cobrir cada parâmetro nas suas cinco faixas, cada tipo de
vitória, e cada fronteira das dez notas.

**9. Propriedades** — Cobrir a faixa da pontuação, a exaustividade da escada, o sentido de cada
tabela (monotonicidade por parâmetro, com a inversão esperada nos dois parâmetros de estado final),
determinismo e totalidade.

**10. Duelos reais** — Cobrir, a partir de estados produzidos pelo motor e não de entradas
sintéticas, que uma vitória rápida e agressiva cai na faixa de poder e uma vitória lenta e carregada
de fusões e magias cai na faixa técnica, e que o tipo de vitória sozinho move a nota na direção
esperada.
