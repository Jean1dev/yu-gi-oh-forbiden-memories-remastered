# Plano de Implementação — Jogar Magia / Armadilha / Terreno

> Spec: `./spec.md`

## Pré-requisitos

- **F06 (Ciclo de Turno e Fases)** — tem spec (`docs/specs/motor-duelo-1x1/F06-ciclo-de-turno-e-fases/`), ainda sem implementação. Esta feature altera três arquivos que F06 cria
  (`packages/shared/src/duel/action.ts`, `action.schema.ts`, `packages/engine/src/turn/apply.ts`) e
  consome dois que F06 expõe (`hasUsedHandPlay`, `markHandPlayUsed`) — a implementação de F06 é
  pré-requisito de execução desta feature, não só de especificação.
- **F02 (Barramento de Eventos e Janela de Reação)** — já especificada e implementada. Consumida
  sem alteração (`createEvent`, `openReactionWindow`, `hasOpenReactionWindow`).
- **F01 (Modelo de Estado do Duelo)** — já especificado e implementado. `SpellZone`,
  `DuelState.activeField` são reusados sem alteração.
- **Coordenação com F08 (Invocar e Posicionar Monstro)** — feature irmã da mesma wave, também
  gerada em paralelo, consumindo o mesmo mecanismo `hasUsedHandPlay`/`markHandPlayUsed` e
  escrevendo nos mesmos arquivos de união de ação e de dispatcher. A ordem de implementação entre
  F08 e F09 é arbitrária, desde que cada uma acrescente sua própria variante sem remover a da
  outra.
- **Pendência registrada, não bloqueante:** o motor não distingue, por schema, uma carta de magia
  de efeito de uma carta de terreno (spec, Decisão 2/9) — quem monta a ação decide qual das duas
  variantes usar. Nenhuma tabela nem classificador é implementado aqui; a pendência fica para
  quando existir uma camada com esse conhecimento (Library/UI hoje, Terrain Engine cross-PRD no
  futuro).
- **Sem pendência de dado externo além da acima.**

## Fase 1: Contrato das duas ações

**1. Ação de colocar magia/armadilha** — Declarar o tipo que representa "colocar uma carta de
magia, armadilha ou equipamento em uma zona de magia/armadilha", identificando a carta pela
posição na mão e a zona de destino, acrescentado à união de ações já existente.

**2. Ação de jogar terreno** — Declarar o tipo que representa "jogar uma carta de terreno",
identificando apenas a carta pela posição na mão, sem zona de destino (o terreno é um único slot
global), acrescentado à mesma união.

**3. Validação de fronteira das duas ações novas** — Declarar os schemas correspondentes,
estendendo a validação fechada da união de ações para reconhecer as duas novas formas.

## Fase 2: Lógica de posicionamento

**4. Função auxiliar de oponente** — Implementar a operação que, dado um jogador, devolve o outro
lado do duelo, para uso na abertura da janela de reação das duas ações desta fase.

**5. Validações e efeito de colocar magia/armadilha** — Implementar, em ordem, as recusas (jogada
da mão já usada, carta ausente, tipo de carta incompatível, todas as zonas ocupadas, zona
escolhida ocupada) e, no caminho de sucesso, a remoção da carta da mão, seu posicionamento na zona
com a face voltada para cima ou para baixo conforme o tipo, e a marcação da jogada da mão como
usada.

**6. Validações e efeito de jogar terreno** — Implementar, em ordem, as recusas (jogada da mão já
usada, carta ausente, tipo de carta incompatível) e, no caminho de sucesso, a remoção da carta da
mão, a substituição do terreno ativo pela carta jogada, e a marcação da jogada da mão como usada.

**7. Emissão de evento e janela de reação nas duas ações** — Emitir o evento de colocação em cada
uma, diferenciando pelo destino (zona de magia/armadilha ou terreno) nos dados adicionais do
evento, e abrir a janela de reação correspondente para o oponente do jogador que jogou a carta.

## Fase 3: Integração ao dispatcher central

**8. Roteamento no dispatcher** — Acrescentar ao ponto único de entrada do motor os dois casos que
delegam para a lógica de colocar magia/armadilha e para a de jogar terreno.

## Fase 4: Publicação e verificação

**9. Exports públicos do subsistema** — Expor as duas operações e a função auxiliar de oponente no
ponto de entrada do pacote do motor, e documentar o novo subsistema no README do pacote.

**10. Testes unitários de colocar magia/armadilha** — Cobrir o caminho de sucesso para os três
tipos de carta aceitos (com a face correta em cada caso), a marcação da jogada da mão, a emissão do
evento com os dados corretos, a abertura da janela de reação, e cada uma das recusas.

**11. Testes unitários de jogar terreno** — Cobrir o caminho de sucesso (incluindo a substituição
de um terreno já ativo sem gerar nenhum evento sobre o anterior), a marcação da jogada da mão, a
emissão do evento, a abertura da janela de reação, e cada uma das recusas.

**12. Testes unitários da função auxiliar de oponente** — Cobrir os dois sentidos da inversão de
jogador.

**13. Teste de propriedade de determinismo** — Cobrir, por geração aleatória de estados e ações
válidas para as duas operações, que a mesma entrada produz sempre o mesmo resultado e que nenhum
campo fora do escopo de cada ação é alterado.
