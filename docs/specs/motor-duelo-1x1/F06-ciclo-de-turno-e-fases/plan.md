# Plano de Implementação — Ciclo de Turno e Fases

> Spec: `./spec.md`

## Pré-requisitos

- **F01, F02, F03** (`docs/specs/motor-duelo-1x1/`) — todas já implementadas. Esta feature altera o
  arquivo de estado criado por F01 (novo campo) e consome o guard de janela de reação de F02 e o
  estado inicial produzido por F03; não redefine nenhum dos três.
- **Nenhuma dependência cross-PRD.**
- **Sem pendência de dado externo.** Nenhuma tabela de guardiões, terrenos, fusões, drops, rating
  ou balanceamento é tocada por esta feature.
- **Nenhuma feature futura (F07–F12) é pré-requisito** — ao contrário, são elas que vão estender o
  que esta feature entrega.

## Fase 1: Contrato de ação

**1. União de ações do motor** — Declarar o tipo que representa "uma ação que um jogador (ou o
sistema) pode submeter ao motor", com sua primeira variante (avançar de fase), pronto para que
features futuras acrescentem novas variantes ao mesmo tipo sem redefini-lo.

**2. Campo de jogada da mão usada** — Acrescentar ao estado de cada jogador um sinalizador que
indica se a jogada única da mão do turno já foi usada, alterando o mesmo arquivo de estado criado
por F01.

## Fase 2: Máquina de fase e turno

**3. Transição entre as quatro fases** — Implementar a lógica que, a partir da fase atual, decide a
próxima fase da sequência Compra → Principal → Batalha → Fim, sem produzir nenhum efeito colateral
observável nas três primeiras transições.

**4. Transição de turno** — Implementar o que acontece ao avançar a partir da fase final: fechar o
turno do jogador ativo, resetar as flags de turno dos monstros dele, resetar o sinalizador de
jogada da mão do próximo jogador, alternar o jogador ativo, incrementar o número do turno e reabrir
a sequência de fases para o novo turno.

**5. Emissão de eventos de turno** — Emitir o evento de fechamento do turno que está terminando e o
evento de abertura do turno que está começando, na ordem correta, como parte da transição de turno.

**6. Predicado de primeiro turno do duelo** — Expor uma função que informa se o turno corrente é o
primeiro do duelo inteiro, para consumo futuro pela regra que bloqueia ataque nesse turno.

**7. Marcação e consulta de jogada da mão usada** — Expor as operações que marcam a jogada da mão
como usada para um jogador e que consultam esse estado, para consumo futuro por quem invoca
monstro ou joga magia/armadilha/terreno.

## Fase 3: Dispatcher central

**8. Recusa por janela de reação aberta** — Antes de processar qualquer avanço de fase, verificar
se existe uma janela de reação pendente e, em caso positivo, recusar a ação sem alterar o estado.

**9. Roteamento da ação de avançar fase** — Implementar o ponto único de entrada que recebe o
estado e uma ação, verifica a recusa acima, delega à máquina de fase/turno, e devolve o par de
estado novo e eventos emitidos.

## Fase 4: Publicação e verificação

**10. Exports públicos do subsistema** — Expor as operações desta feature no ponto de entrada do
pacote do motor, ao lado dos subsistemas já existentes, e documentar o novo subsistema no README do
pacote.

**11. Testes unitários da máquina de fase e turno** — Cobrir cada uma das quatro transições de
fase, a transição de turno completa (troca de jogador, incremento de turno, reset de flags,
emissão de eventos na ordem correta) e a não-alteração das flags do oponente.

**12. Testes unitários de jogada da mão e primeiro turno** — Cobrir marcação, consulta, reset e
idempotência do sinalizador de jogada da mão, e os dois casos do predicado de primeiro turno.

**13. Teste de propriedade de determinismo e monotonicidade** — Cobrir, por geração aleatória de
estados e sequências de avanço de fase, que a fase segue sempre a ordem cíclica esperada, que o
turno nunca decresce, e que repetir a mesma sequência a partir do mesmo estado produz sempre o
mesmo resultado.
