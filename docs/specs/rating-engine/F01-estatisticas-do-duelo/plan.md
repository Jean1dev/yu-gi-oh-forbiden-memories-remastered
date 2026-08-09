# Plano de Implementação — Estatísticas do Duelo

> Spec: `./spec.md`

## Pré-requisitos

- `motor-duelo-1x1` F01, F02, F05 e F12 implementados — `DuelState`, o barramento de eventos, a
  serialização e o carimbo de desfecho já existem e são os pontos de extensão desta feature.
- `fusion-system` F02 implementado — `complete_fusion` e `pendingFusion` são a fonte do contador de
  fusões.
- Ativação de armadilha **não** existe no motor: `triggeredTraps` é entregue como contador real
  permanentemente em zero, sem valor simulado (spec, Decisão 6).
- Nenhuma dependência de dado externo, nenhuma tabela pendente, nenhuma migração.

## Fase 1: Contrato no `shared`

**1. Lista fechada de contadores** — Acrescentar aos constantes do duelo a lista dos sete nomes de
contador, no mesmo padrão já usado pelo vocabulário de eventos, para que o tipo e o schema derivem
dela em vez de repetirem a enumeração.

**2. Tipos de estatística** — Criar o módulo de tipos de estatística do duelo, declarando o registro
de contadores de um jogador e o registro indexado por jogador.

**3. Campo no estado e no schema** — Acrescentar o campo de estatísticas ao estado do duelo como
campo obrigatório e ao schema zod correspondente, deixando a guarda de coerência entre tipo e schema
já existente cobrir o campo novo. Exportar os tipos e o schema pelo índice do pacote.

## Fase 2: Acumulador no motor

**4. Zero dos contadores** — Criar o módulo que produz o conjunto zerado de contadores para um
jogador e para os dois, e passar a inicializar o estado do duelo com ele.

**5. Acumulador puro** — Criar a função de acumulação que recebe o estado anterior, a ação e o
resultado da ação, e devolve o resultado com os contadores atualizados. A derivação por ação e a
derivação do par ataque/defesa estão descritas na spec; a função é total, pura e não emite evento.

**6. Encadeamento no dispatcher** — Ligar a acumulação ao ponto único de pós-processamento de
`apply`, antes do carimbo de desfecho, para que a jogada que encerra o duelo ainda seja contada.
Exportar o subsistema pelo índice do pacote.

## Fase 3: Cobertura

**7. Unitários do acumulador** — Cobrir um caso por contador e por ramo de decisão, incluindo os
ramos que deliberadamente **não** contam: ataque direto, alvo destruído em defesa, alvo sobrevivente
em ataque, e as ações neutras.

**8. Propriedades do acumulador** — Cobrir monotonicidade, incremento unitário por ação, totalidade
e — a mais importante — não-interferência: o resultado difere da entrada somente no campo de
estatísticas.

**9. Serialização e schema** — Estender o teste de propriedade de round-trip para incluir os
contadores e cobrir no schema a rejeição de contador negativo, fracionário, chave desconhecida e
estado sem o campo.

**10. Duelo completo** — Cobrir uma partida inteira do início ao desfecho conferindo que os
contadores refletem as jogadas feitas, e que a mesma semente com a mesma sequência de ações produz
estatísticas idênticas.
