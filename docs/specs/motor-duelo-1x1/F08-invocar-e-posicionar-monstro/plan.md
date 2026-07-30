# Plano de Implementação — Invocar e Posicionar Monstro

> Spec: `./spec.md`

## Pré-requisitos

- **F06 (Ciclo de Turno e Fases)** — tem spec (`docs/specs/motor-duelo-1x1/F06-ciclo-de-turno-e-fases/`), ainda sem implementação. Esta feature altera três arquivos que F06 cria
  (`packages/shared/src/duel/action.ts`, `action.schema.ts`, `packages/engine/src/turn/apply.ts`) e
  consome dois que F06 expõe (`hasUsedHandPlay`, `markHandPlayUsed` em `packages/engine/src/turn/
  hand-play.ts`) — a implementação de F06 é pré-requisito de execução desta feature, não só de
  especificação.
- **F02 (Barramento de Eventos e Janela de Reação)** — já especificada e implementada
  (`packages/engine/src/events`). Consumida sem alteração (`createEvent`, `openReactionWindow`).
- **F01 (Modelo de Estado do Duelo)** — já especificado e implementado. `MonsterZone`,
  `PlayerField`, `TOTAL_MONSTER_ZONES` são reusados sem alteração.
- **Coordenação com F09 (Jogar Magia/Armadilha/Terreno)** — feature irmã da mesma wave, também
  gerada em paralelo, que consome o mesmo mecanismo `hasUsedHandPlay`/`markHandPlayUsed`. Nenhuma
  das duas specs precisa da outra para ser implementada, mas ambas escrevem no mesmo arquivo
  `packages/shared/src/duel/action.ts`/`action.schema.ts` e no mesmo `switch` de `apply` — a ordem
  de implementação entre F08 e F09 é arbitrária, desde que cada uma acrescente sua própria variante
  sem remover a da outra.
- **Fusion System (cross-PRD, opcional)** — não existe; a via de invocação por fusão fica
  registrada como extensão futura (spec, Decisão 9), sem bloquear esta implementação.
- **Sem pendência de dado externo.**

## Fase 1: Contrato da ação de invocar

**1. Nova variante de ação** — Declarar o tipo que representa "invocar uma carta da mão para uma
zona de monstro em uma posição escolhida", identificando o jogador, a carta pela posição na mão, a
zona de destino e a posição, acrescentando-o à união de ações já existente sem alterar as demais
variantes.

**2. Validação de fronteira da nova ação** — Declarar o schema correspondente, seguindo o mesmo
formato fechado (`strictObject`) já usado pelas demais partes do estado e das ações.

## Fase 2: Lógica de invocação

**3. Validações de recusa** — Implementar, em ordem, as checagens que impedem a invocação: jogada
da mão já usada no turno, carta ausente na posição indicada da mão, carta de tipo não invocável,
todas as zonas de monstro ocupadas, e a zona especificamente escolhida já ocupada.

**4. Efeito da invocação bem-sucedida** — Implementar a transição que remove a carta da mão, a
posiciona na zona escolhida com a posição pedida e as flags de turno zeradas, marca a jogada da mão
como usada, e devolve o estado atualizado.

**5. Emissão de evento e janela de reação** — Determinar se a invocação emite o evento de
revelação ou o de colocação face-baixo conforme a posição escolhida, e abrir a janela de reação
correspondente para o oponente do jogador que invocou.

## Fase 3: Integração ao dispatcher central

**6. Roteamento no dispatcher** — Acrescentar ao ponto único de entrada do motor o caso que
delega para a lógica de invocação quando a ação recebida for a de invocar monstro.

## Fase 4: Publicação e verificação

**7. Exports públicos do subsistema** — Expor a operação de invocação no ponto de entrada do
pacote do motor, ao lado dos subsistemas já existentes, e documentar o novo subsistema no README
do pacote.

**8. Testes unitários do caminho de sucesso** — Cobrir as quatro combinações de posição possíveis,
a remoção da carta da mão, a marcação da jogada da mão como usada, a abertura da janela de reação
com o oponente correto, e a preservação do `atk`/`def` base da carta movida.

**9. Testes unitários das recusas** — Cobrir cada uma das checagens de recusa isoladamente, e
confirmar que o estado permanece inalterado em cada caminho de recusa.

**10. Teste de propriedade de invariantes** — Cobrir, por geração aleatória de estados e ações
válidas, que a mão sempre perde exatamente uma carta e o campo sempre ganha exatamente uma zona
ocupada a mais, que os valores base de ATK/DEF nunca são alterados, e que a mesma entrada produz
sempre o mesmo resultado.
