# Plano de Implementação — Rendição e Abandono

> Spec: `./spec.md`

## Pré-requisitos

- **F03 (Orquestração da Partida)** — dependência interna listada no PRD §8, com spec já publicada.
  F04 consome especificamente o canal de interrupção que ignora a checagem de vez (distinto do
  canal de jogadas normais de turno) para encaminhar a rendição — ver spec §1, Contratos externos
  assumidos.
- **`MotorDuelo/F12` (cross-PRD, sem spec própria)** — contrato externo assumido: uma Acao de
  rendição aceita pelo motor a qualquer momento, independentemente de turno, levando o estado a
  `fase: 'fim'` com o jogador local como perdedor. A decodificação de vencedor/motivo a partir do
  estado final é de F05, não desta feature (spec §4).
- Nenhuma pendência de dado externo (guardião, terreno, fusão, drop, rating, balanceamento) toca
  esta feature.

## Fase 1: Encaminhamento da rendição

**1. Guarda de disponibilidade** — implementar a verificação pura que decide, a partir da fase
atual da sessão de duelo, se a rendição pode ser acionada agora. Cobrir o caso "duelo já terminado"
como resultado negativo, sem produzir erro.

**2. Encaminhamento ao motor** — implementar a função que, quando a rendição pode ser acionada,
constrói a intenção de rendição do jogador local e a repassa ao ponto de submissão de ação já
estabelecido por F03, devolvendo a sessão resultante sem interpretar seu conteúdo além do
necessário para a Seção 3 da spec. Quando a rendição não pode ser acionada, devolver a sessão
inalterada.

**3. Independência de turno** — garantir que o encaminhamento use o canal de interrupção de F03 (não
o canal de jogadas normais de turno), para que a rendição funcione a qualquer momento da partida,
inclusive fora da vez do jogador, conforme a Seção 3 da spec.

## Fase 2: Confirmação e interceptação de saída

**4. Diálogo de confirmação** — construir o componente de confirmação com a mensagem exata do PRD,
compartilhado pelos dois gatilhos (render explícito e tentativa de saída), acionando o
encaminhamento apenas quando o jogador confirma.

**5. Controle de render-se na tela de duelo** — construir o controle de "Render-se" a ser integrado
à tela de duelo estabelecida por F03, disponível durante toda a fase em andamento e
ausente/desabilitado fora dela.

**6. Interceptação de saída da tela** — implementar a interceptação de tentativas de navegação para
fora da tela de duelo enquanto a sessão está em andamento, redirecionando para o mesmo fluxo de
confirmação do passo 4 em vez de deixar a saída ocorrer sem aviso.

**7. Corrida entre confirmação e fim natural do duelo** — garantir que a confirmação de rendição
relê o estado da sessão no momento de confirmar (não no momento em que o diálogo foi aberto), para
que um duelo encerrado por outro motivo entre esses dois instantes não seja sobrescrito pela
rendição.

**8. Fechamento abrupto de aba/app** — verificar e documentar que nenhuma ação desta feature roda
nesse caso, apoiando-se na decisão de F03 de não persistir sessão em andamento, conforme a Seção 3
da spec.
