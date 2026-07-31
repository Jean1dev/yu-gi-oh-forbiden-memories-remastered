# Plano de Implementação — Mudança de Posição

> Spec: `./spec.md`

## Pré-requisitos

- **F01, F02** (`docs/specs/motor-duelo-1x1/`) — já implementadas. Esta feature consome o
  `MonsterPosition`/`MonsterZone`/`hasChangedPosition` de F01 e o `ZoneReference`/`createEvent`/
  `hasOpenReactionWindow` de F02, sem redefinir nenhum dos dois.
- **F06 (Ciclo de Turno e Fases)** — **tem spec, mas ainda não está implementada**
  (`packages/engine/src/turn/` não existe hoje). Esta feature depende diretamente dos contratos que
  a spec de F06 declara: a união `Action`, o dispatcher `apply(state, action)` (assinatura
  `Result<ApplyResult, DomainError>`) e a garantia de que `state.phase === "battle"` só é alcançável
  depois que F06 conduzir o turno até lá. **F06 precisa ser implementada antes desta feature**, ou
  ao menos antes de qualquer teste de integração cross-feature que dependa do fluxo completo de
  turno; os testes unitários desta feature podem ser escritos contra estados construídos
  diretamente na fase `"battle"`, sem esperar F06.
- **Nenhuma dependência cross-PRD.**
- **Sem pendência de dado externo.** Nenhuma tabela de guardiões, terrenos, fusões, drops, rating
  ou balanceamento é tocada por esta feature.
- **Execução em lote (Wave 4):** F07, F08, F09 e F11 são especificadas em paralelo a esta feature,
  cada uma acrescentando sua própria variante ao mesmo `Action`/`ActionSchema` e seu próprio `case`
  ao mesmo `apply`. A ordem de integração dessas contribuições entre si é resolvida na
  implementação, não neste plano.

## Fase 1: Contrato de ação

**1. Nova variante de ação para mudar de posição** — Acrescentar, ao mesmo tipo de união de ações
que F06 cria, uma variante que representa "mudar a posição do monstro em uma zona específica de um
jogador", reaproveitando a referência de zona já existente em vez de inventar uma forma nova.

**2. Schema de validação da nova ação** — Acrescentar o schema correspondente à nova variante, para
que ações vindas de fora do motor (rede, UI, IA) sejam validadas na fronteira antes de chegar ao
dispatcher.

## Fase 2: Matriz de transição de posição

**3. Função de próxima posição** — Implementar a função pura que, a partir da posição atual de um
monstro, decide sua próxima posição: alterna sempre entre ataque e defesa, e força a face para cima
sempre que a posição de origem for face-baixo.

**4. Predicado de face-baixo** — Expor uma função que informa se uma posição é uma das duas
variantes face-baixo, usada para decidir se a mudança revela o monstro.

## Fase 3: Validação e transição de estado

**5. Validações de recusa, em ordem** — Implementar a sequência de checagens que uma tentativa de
mudança de posição precisa passar antes de ser aceita: nenhuma janela de reação aberta, fase de
Batalha, zona referenciada é de monstro, zona pertence ao jogador ativo, zona ocupada, e o monstro
ainda não mudou de posição neste turno — cada recusa devolvendo o código específico do cenário, sem
alterar o estado.

**6. Aplicação da transição** — Depois de passar por todas as validações, atualizar apenas a zona
referenciada com a nova posição e a marcação de "já mudou de posição neste turno", preservando
intocados a carta, a flag de ataque, as demais zonas e todo o restante do estado.

**7. Emissão dos eventos de mudança de posição** — Montar a lista de eventos da operação bem-
sucedida: o evento de revelação, apenas quando a mudança revela um monstro face-baixo, seguido
sempre do evento de mudança de posição.

## Fase 4: Integração ao dispatcher e publicação

**8. Roteamento no dispatcher central** — Acrescentar, ao mesmo ponto único de entrada que F06 cria,
o tratamento desta nova variante de ação, delegando às validações e à transição implementadas nas
fases anteriores.

**9. Exports públicos do subsistema** — Expor as operações desta feature no ponto de entrada do
pacote do motor, ao lado dos subsistemas já existentes, e documentar o novo subsistema no README do
pacote.

**10. Testes unitários da matriz de transição** — Cobrir as quatro transições possíveis de posição e
o predicado de face-baixo para as quatro posições.

**11. Testes unitários de validação e transição de estado** — Cobrir os casos de sucesso (com e sem
revelação), a preservação dos campos não tocados, e cada um dos cenários de recusa com seu código
específico.

**12. Testes unitários do roteamento no dispatcher** — Cobrir que a nova variante de ação é
encaminhada corretamente e que o resultado (sucesso ou recusa) é devolvido sem processamento
adicional.

**13. Teste de propriedade de preservação estrutural e não-dupla-aplicação** — Cobrir, por geração
aleatória de estados válidos na fase de Batalha, que a mudança de posição altera exclusivamente a
zona-alvo e que repetir a mesma mudança sobre o mesmo estado resultante sempre falha por já ter sido
usada.
