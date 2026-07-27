# Plano de Implementação — Inicialização do Duelo

> Spec: `./spec.md`

## Pré-requisitos

- **Specs de `motor-duelo-1x1`/F01 e F02**, ainda sem implementação. Esta feature estende os
  mesmos arquivos de `EstadoDuelo` (campo `seed`) e usa o pacote `packages/engine` criado por F02.
- **Contrato externo — validador de deck (`free-duel`/F02, `packages/rules/src/deck/`).** Tem
  spec, ainda sem implementação. É reusado sem redefinição — nenhuma segunda checagem de
  40/≤3/existência dentro do motor.
- **Contrato externo — `ConsultaCatalogo` (`banco-de-cartas`/F03).** Ainda não existe. Os testes
  desta feature usam um catálogo sintético em memória enquanto isso.
- **Contrato externo — `BuildDeck/FXX`.** Satisfeito na prática por `free-duel`/F02 (deck do
  jogador) e `free-duel`/F01 (deck do NPC), ambos já entregando `ComposicaoDeck`.
- **Decisão de desenho confirmada na entrevista:** F03 revalida os decks com autoridade, reusando
  o validador de `packages/rules`, em vez de confiar num deck já validado pelo chamador.
- **Sem pendência de dado externo.** Nenhuma tabela de guardiões, terrenos, fusões, drops, rating
  ou balanceamento é tocada por esta feature — a validação aqui é estrutural (Fase 0), não de
  balanceamento.

## Fase 1: Extensão do estado e contrato de entrada

**1. Campo de determinismo no estado** — Acrescentar ao `EstadoDuelo` já existente o valor que
registra por qual seed a partida foi embaralhada, junto da sua validação e de uma nova constante
para o tamanho da mão inicial.

**2. Forma da entrada já validada** — Definir a estrutura intermediária que representa "os dois
decks, já resolvidos em cartas completas, prontos para embaralhar" — o único formato que a etapa de
montagem do estado vai aceitar.

## Fase 2: Geração pseudoaleatória determinística

**3. Gerador semeado** — Implementar o gerador de números pseudoaleatórios determinístico que dá
sustentação a todo sorteio desta feature, isolado como o único ponto do motor que produz uma
sequência de valores a partir de uma semente.

**4. Embaralhamento genérico** — Implementar a função pura que permuta qualquer lista a partir do
gerador, sem alterar a lista original nem depender de nada além da sequência recebida.

## Fase 3: Validação e resolução dos decks

**5. Tradução das violações estruturais para as mensagens do produto** — Compor a validação já
existente do validador de deck reusado com a tradução de cada tipo de violação para uma das três
mensagens que este PRD define, decidindo qual delas mostrar quando mais de uma se aplica.

**6. Resolução de cartas e de semente** — A partir de cada deck já validado, resolver a lista
completa de cartas correspondente e decidir a semente final da partida — a fornecida ou, na
ausência dela, uma gerada por quem chama esta função.

## Fase 4: Montagem do estado inicial

**7. Distribuição de mão e baralho** — A partir dos dois decks já embaralhados, separar as
primeiras cartas como mão inicial de cada jogador e o restante como o baralho remanescente, na
mesma ordem do embaralhamento.

**8. Sorteio de quem começa** — Decidir, a partir do mesmo fluxo de aleatoriedade já usado para
embaralhar os dois decks, qual jogador assume o primeiro turno.

**9. Composição do estado pronto para o turno 1** — Reunir pontos de vida iniciais, mãos, baralhos,
campo vazio, ausência de terreno, o jogador sorteado e a semente registrada num único objeto de
estado, sem nenhuma ação pendente.

## Fase 5: Garantias e verificação

**10. Portão de análise estática ampliado** — Estender a verificação de fronteira de pacotes para
permitir que o motor importe do pacote de regras reusado nesta feature, mantendo a proibição de
qualquer biblioteca de interface, rede ou persistência.

**11. Testes unitários do gerador e do embaralhamento** — Cobrir a repetibilidade do gerador para
uma mesma semente e a preservação de conteúdo e comprimento pelo embaralhamento.

**12. Testes unitários da validação e resolução de entrada** — Cobrir cada uma das três recusas
possíveis com sua mensagem específica, a prioridade entre violações simultâneas, a interrupção
antes de checar o segundo jogador, e a resolução completa de cartas e semente no caminho feliz.

**13. Testes unitários da montagem do estado inicial** — Cobrir a distribuição correta de mão e
baralho, os pontos de vida, o campo vazio, a ausência de terreno, o turno e a fase iniciais, e a
preservação da semente no resultado.

**14. Teste de propriedade do determinismo ponta a ponta** — Cobrir por geração aleatória a
garantia central desta feature: a mesma semente com os mesmos dois decks sempre produz exatamente
o mesmo estado inicial, em muitas execuções repetidas.
