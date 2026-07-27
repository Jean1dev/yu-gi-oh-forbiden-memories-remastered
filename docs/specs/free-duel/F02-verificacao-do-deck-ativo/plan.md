# Plano de Implementação — Verificação do Deck Ativo

> Spec: `./spec.md`

## Pré-requisitos

- **Nenhuma dependência interna do módulo.** Na tabela do PRD §8, F02 depende exclusivamente de
  `BuildDeck/F07` (cross-PRD). F01 (roster) é irmã de wave e não é pré-requisito: as duas só se
  encontram em F03. F02 apenas recebe o oponente escolhido pela navegação de F01.
- **Scaffolding do monorepo já criado por `banco-de-cartas` F01** — pnpm workspaces, Turborepo,
  TypeScript strict, Node.js 24 LTS, `packages/shared` e `packages/data`. O pacote
  `packages/rules` e a app `apps/web` são criados pelas specs de `build-deck` F01 e `free-duel`
  F01; esta feature acrescenta módulos a eles e não recria nada.
- **Reuso obrigatório, sem duplicar:** as constantes de tamanho de deck e de limite de cópias já
  são declaradas pela spec de `free-duel` F01 em `packages/shared`; os primitivos de resultado e de
  erro de domínio, o schema de carta e a porta de consulta ao catálogo já são declarados pelas
  specs de `banco-de-cartas` F01 e `build-deck` F01. Nada disso é redefinido aqui.
- **Contrato externo assumido — `BuildDeck/F07` (deck ativo persistido):** a tabela de deck ativo
  com um registro por jogador no formato mapa de carta para quantidade, com isolamento por
  jogador, e o snapshot equivalente no cache local gravado pelo save do Build Deck. A migração e a
  escrita pertencem a F07; esta feature só lê, e nunca lê o rascunho de edição.
- **Contrato externo assumido — catálogo de cartas (`banco-de-cartas` F01/F03):** consulta de
  existência por carta sobre as 722 cartas canônicas, injetada como porta. Enquanto o serviço de
  catálogo não existir, a porta é satisfeita por um adaptador mínimo sobre o dataset gerado, e os
  testes da regra a satisfazem com catálogo sintético.
- **Contrato externo assumido — sessão autenticada (Auth/Supabase):** fornece o identificador do
  jogador usado na leitura. Ausência e expiração de sessão são desfechos previstos, não exceções.
- **Contrato oferecido a jusante — F03 e `build-deck` F06:** F03 consome o deck válido e a flag
  produzidos aqui e é quem inicializa o duelo; `build-deck` F06 deve compor o validador criado aqui
  em vez de reimplementar os limites de deck. Nenhuma chamada ao motor de duelo pertence a esta
  feature.
- **Nenhuma pendência de dado externo.** Os três limites aplicados são invariantes da Fase 0 vindos
  de `product.md`, não valores de balanceamento; não há tabela de guardião, terreno, fusão, drop,
  rating ou roster envolvida e nenhum fallback neutro é necessário.
- **Decisões a confirmar antes de codar** (registradas em Decisões e Premissas da spec, itens 3, 4,
  16 e 19): a convergência do validador com `build-deck` F06 quando aquela feature ganhar spec; a
  convergência de semântica com o validador de deck de NPC de `free-duel` F01, que por direção de
  dependências não pode compartilhar implementação; a ausência de store global de estado, com a
  escolha do adaptador de estado adiada para F03; e a convenção de caminhos da app web, divergente
  entre as specs de `build-deck` F01 e `free-duel` F01.

## Fase 1: Contratos do deck em `packages/shared`

**1. Vocabulário do deck** — Declarar os tipos do domínio de deck do jogador: a composição
canônica na mesma forma em que o Build Deck a persiste, o vocabulário fechado de violações de
validade, o veredito de validação, o deck pronto entregue à orquestração da partida e a procedência
do carregamento. Reusar as constantes de tamanho e de limite de cópias já declaradas por
`free-duel` F01, sem criar constante paralela.

**2. Schemas de fronteira** — Definir os schemas de validação que descrevem a composição do deck, a
linha vinda do banco e o snapshot vindo do cache local, tratando os dois últimos como entrada não
confiável. Os schemas cobrem apenas forma; os limites de validade produzem violações estruturadas e
ficam fora deles.

**3. Códigos de erro e exports públicos** — Declarar o conjunto fechado de códigos de erro do
subsistema de deck e acrescentar o subsistema ao export público do pacote, reusando os primitivos de
resultado e de erro de domínio já existentes.

## Fase 2: Regra de validade de deck em `packages/rules`

**4. Contagem e expansão determinística** — Implementar a contagem total de cartas da composição e
a expansão da composição em uma lista com uma entrada por cópia, em ordem estável e independente da
ordem das chaves de origem, que é a forma exigida pela orquestração da partida.

**5. Validador estrutural** — Implementar a validação pura dos invariantes que não dependem de dado
externo — tamanho exato do deck, limite de cópias por carta e domínio das quantidades —
acumulando todas as violações em ordem determinística em vez de parar na primeira.

**6. Validador para duelo e montagem do deck pronto** — Estender o validador estrutural com a
verificação de existência de cada carta no catálogo, recebido por injeção, e implementar a função
que, apenas no veredito válido, devolve o deck pronto para a orquestração. Registrar no pacote que
estas funções são a fonte única dos limites de deck do projeto, disponível ao módulo de montagem.

## Fase 3: Carregamento e portão de verificação em `apps/web`

**7. Leitura do deck ativo no servidor** — Implementar o adaptador que lê o deck ativo do jogador
autenticado e valida a resposta na fronteira, distinguindo com clareza três situações: registro
válido, ausência legítima de deck e conteúdo corrompido.

**8. Leitura do snapshot no cache local** — Implementar a leitura somente-leitura do snapshot do
deck ativo, validando-o antes do uso e tratando snapshot corrompido ou ambiente sem armazenamento
como ausência, sem derrubar o fluxo. Nenhuma escrita é introduzida: o registro pertence ao Build
Deck.

**9. Orquestração do carregamento** — Implementar a composição servidor → cache que define a
procedência do dado, recorre ao cache apenas quando a leitura remota falha, e nunca devolve deck
vazio por falha nem cria entrada na fila de mutações offline.

**10. Portão de verificação** — Implementar a função que compõe o carregamento com o validador do
pacote de regras e traduz o resultado nos três desfechos que o PRD trata de forma diferente:
liberado, bloqueado e indisponível. Ela é total, nunca lança, e é o único ponto que registra as
violações devolvidas pelo núcleo puro.

## Fase 4: Tela de preparação e portões de fronteira

**11. Mensagens e hook de consumo** — Implementar o mapeamento de cada desfecho para a mensagem
exata definida pelo PRD e para o rótulo legível de cada violação, e o hook fino que dispara a
verificação, expõe o estado à tela e oferece a reexecução, sem introduzir store global.

**12. Tela de preparação** — Implementar a rota de preparação que recebe o oponente escolhido por
F01 e o componente que, no desfecho liberado, faz o handoff do deck pronto à orquestração da
partida; no desfecho bloqueado, exibe a mensagem do PRD com as violações e o acesso direto ao Build
Deck; e no desfecho indisponível, exibe a mensagem de falha com nova tentativa. O duelo não inicia
em nenhum desfecho que não seja o liberado, sem seletor de deck e sem edição.

**13. Portões de fronteira** — Configurar a análise estática que impede o núcleo da regra de deck de
importar interface ou I/O, impede a camada web de repetir os limites de deck ou reimplementar a
validação, impede qualquer escrita ou leitura de rascunho nesta feature, e impede a importação do
motor e da IA, sustentando as fronteiras declaradas na arquitetura.
