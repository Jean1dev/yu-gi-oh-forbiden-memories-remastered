# Plano de Implementação — Tela de Duelo Jogável

> Spec: `./spec.md`

## Pré-requisitos

- **Dependência interna obrigatória — `free-duel` F09 (Integração do Motor no Duelo Offline)**
  implementada: o `DuelRuntime`, a porta `apply` em `Result`, a liquidação da janela de reação, o
  `onStep` da CPU, o agente passivo, o store como escritor único e o catálogo entregue pelo Server
  Component. F10 **consome** esses contratos e não os redefine.
- **Dependências internas já implementadas:** F01 (roster), F02 (verificação do deck), F03
  (orquestração), F04 (rendição e guarda de saída), F05 (resultado e nota), F08 (navegação pós-duelo).
- **Dependência cross-PRD já implementada:** `motor-duelo-1x1` F01–F12 (`packages/engine`) e
  `packages/rules` com `getPublicDuelState`, que é o insumo de renderização do lado do oponente.
- **Contrato externo assumido — IA de NPCs (`packages/ai`):** não existe. A tela é indiferente a quem
  decide por P2; trocar o agente passivo pelo real não altera nenhum arquivo desta feature.
- **Contrato externo assumido — Rating Engine:** ausente. O overlay de fim de duelo renderiza o que
  F05 apurar, incluindo a recompensa mínima de fallback.
- **Pendência de dado externo — matrizes de terreno e de Guardião Estelar:** vazias. O fallback neutro
  adotado é exibir apenas o **nome** do terreno ativo (ou "Nenhum") e nenhum modificador; não há
  escolha de Guardião na invocação porque o motor não a modela.
- **Lacuna declarada aceita antes de codar:** F06 (drop) e F07 (estrelas) seguem desligadas por F09; a
  vitória informa a recompensa como pendente dentro do overlay.
- **Decisões de desenho já tomadas** (Seção 1 da spec, tabela de Decisões e Premissas), notadamente:
  renderizar da projeção pública e calcular legalidade do estado cru; textos da tela de duelo em PT-BR
  com as telas vizinhas intocadas; CSS Modules sem biblioteca de animação; três slots de ação fixos.
- **Ambiente:** Node 24 (`nvm use`) e `packages/data/generated/` construído.

## Fase 1: Máquina de interação, mensagens e cues

**1. Máquina de interação** — Criar o módulo puro que modela a intenção corrente do jogador, reduz
eventos de interface em novas intenções e, quando a sequência se completa, produz a ação de duelo
correspondente. Sem React, sem DOM, testável em ambiente node.

**2. Afordâncias e slots de ação** — No mesmo módulo, derivar do estado cru os booleanos que habilitam
cada jogada, espelhando as guardas do motor, e a tupla fixa de três slots. A camada é um pré-gate de
conveniência: quem decide legalidade continua sendo o motor.

**3. Mensagens da tela** — Criar os dois módulos de texto: o mapa de códigos de recusa do motor para
frases em português com fallback genérico, e os rótulos da tela (fases, posições, zonas, slots,
banners), no padrão dos arquivos de mensagem já existentes no repositório.

**4. Derivação das animações** — Criar o módulo puro que traduz o lote de eventos de um despacho em
uma fila ordenada de indicações visuais por zona ou por jogador, com duração fixa por tipo e teto de
fila. Cobrir com teste de propriedade que a função é total sobre qualquer arranjo de eventos.

## Fase 2: Chrome do tabuleiro

**5. Componente de arte de carta** — Criar o componente de arte endereçada por número da carta, com
proporção declarada de antemão e recuo para o marcador neutro em caso de falha de carregamento, no
molde do componente equivalente da Library.

**6. Zona do campo** — Criar o componente de uma zona: superfície rebaixada, arte quando visível,
faixa de ataque e defesa no rodapé, rótulo de vazia distinto entre a fileira de monstros e a de trás,
atributo de afordância e atributo de animação. O alvo clicável é um botão de teclado real, sem estilo
herdado, com foco visível redeclarado.

**7. Lado do campo e indicador de pontos de vida** — Criar o componente de um lado do campo, com o
lado do jogador espelhado em relação ao do oponente, e reescrever o indicador de pontos de vida no
estilo do design system, preservando o nó de texto que as suítes existentes consultam. Incluir a
contagem da mão e do deck ao lado dos pontos de vida.

**8. Tabuleiro e barra superior** — Reescrever o tabuleiro para consumir a projeção pública e compor
os dois lados, e criar a barra superior com terreno, fase, turno, o controle de rendição e a saída do
duelo. Manter o caminho de import e o arquivo de teste do tabuleiro.

**9. Verificação do chrome** — Confirmar em jsdom as dez zonas de cada tipo com rótulos em português,
os valores de ataque e defesa nos monstros virados para cima, os rótulos de zona vazia, e que uma
zona virada para baixo do oponente não renderiza nome nem valores.

## Fase 3: Barra da mão, ações, prévia e prompt

**10. Mão do jogador** — Reescrever a mão como uma faixa horizontal rolável de botões de carta com
largura fixa, anel de seleção na carta ativa e o nome da carta como rótulo acessível, preservado das
suítes existentes.

**11. Slots de ação e barra da mão** — Criar o contêiner de rodapé que reúne a mão e os três slots, e
o componente dos slots, que renderiza sempre três botões com variante e estado desabilitado vindos da
máquina de interação.

**12. Prévia, prompt e linha de mensagem** — Criar o overlay de prévia da carta selecionada, o
componente de instrução do passo corrente com o seletor das quatro posições, e a linha de aviso em
região assertiva usada tanto pela recusa quanto pelo banner de vez do oponente.

## Fase 4: Tela integrada

**13. Casca React da máquina de interação** — Criar o hook que mantém a intenção corrente, expõe os
manipuladores de seleção, ativação de zona e escolha de posição, e despacha a ação assim que a máquina
a produz.

**14. Composição da tela** — Reescrever a tela de duelo em português: projetar a visão pública a
partir do estado da sessão, calcular afordâncias sobre o estado cru, montar barra superior, tabuleiro,
barra da mão, prévia, prompt e mensagens, e ligar o controle de saída à confirmação de rendição já
existente. Aplicar o layout de altura total sem introduzir regra global de rolagem.

**15. Verificação do fluxo jogável** — Reescrever a suíte da tela cobrindo o caminho de invocação
completo, a colocação de magia na fileira de trás, o ataque com alvo e o direto, a desabilitação
durante o turno do oponente e a recusa que não altera o tabuleiro.

## Fase 5: Animações

**16. Fila de animações** — Criar o hook que consome a fila derivada dos eventos, mantém uma indicação
ativa por vez com a duração do seu tipo, expõe a consulta por zona e por jogador, e sinaliza ocupação
enquanto roda. O hook consulta a preferência de movimento do sistema de forma defensiva, tratando a
ausência da API como movimento não reduzido.

**17. Keyframes e fiação** — Declarar as animações nos módulos de estilo das zonas, da mão e do
indicador de pontos de vida, todas condicionadas à preferência por movimento, e ligar a fila à tela de
modo que cada despacho e cada passo do oponente alimentem as indicações.

**18. Verificação da temporização** — Cobrir com relógio controlado que uma jogada marca a zona
correspondente e a limpa ao fim da duração, e que sob preferência por movimento reduzido nenhuma
indicação fica ativa e a ocupação nunca é sinalizada.

## Fase 6: Fim de duelo e cobertura ponta a ponta

**19. Overlay de resultado** — Criar o contêiner que cobre a tela ao fim do duelo emoldurando os
componentes de resultado e de navegação pós-duelo já existentes, sem alterá-los, e congelar o
tabuleiro atrás dele.

**20. Partida completa contra o motor real** — Escrever o teste de integração que conduz uma partida
inteira pela interface em jsdom, contra o motor real e sem nenhum substituto além do ritmo do
oponente, do início à rendição, verificando a queda de pontos de vida e as opções pós-duelo.

**21. Portão de fronteira e validação manual** — Confirmar que o portão de confinamento do motor
continua verde e que ele falha se um componente desta feature importar o motor, e percorrer
manualmente a experiência completa no navegador comparando o resultado lado a lado com o protótipo.
