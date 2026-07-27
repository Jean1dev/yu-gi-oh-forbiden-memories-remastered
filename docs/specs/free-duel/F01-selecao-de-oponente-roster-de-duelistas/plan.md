# Plano de Implementação — Seleção de Oponente (Roster de Duelistas)

> Spec: `./spec.md`

## Pré-requisitos

- **Nenhuma dependência interna do módulo.** F01 tem `Dependências: None` na tabela do PRD §8 e é
  Foundation do Free Duel; F02 a F08 dependem dela, não o contrário.
- **Scaffolding do monorepo já criado por `banco-de-cartas` F01** — pnpm workspaces, Turborepo,
  TypeScript strict, Node.js 24 LTS, `packages/shared` e `packages/data`. Esta feature acrescenta
  módulos a esses pacotes e cria `apps/web`; não recria o scaffolding.
- **Contrato externo assumido — catálogo de cartas (`packages/data`, banco-de-cartas F01/F03):**
  consulta por `numero` sobre as 722 cartas canônicas, injetada no loader como porta. Enquanto
  banco-de-cartas F03 não existir, a porta é satisfeita por um adaptador mínimo sobre o dataset
  gerado, e os testes a satisfazem com catálogo sintético.
- **Contrato externo assumido — bundle versionado (banco-de-cartas F09/F10):** transporta o roster
  junto do catálogo e fornece `version` + `hash` para invalidar o cache local. Interino: servir o
  arquivo de roster como asset estático da app, usando só `versaoRoster` como chave de cache.
- **Contrato externo assumido — IA de NPCs (`packages/ai`):** consumidora do perfil de dificuldade
  que esta feature provê via F03. O conjunto de identificadores de estratégia válidos pertence a
  esse módulo; aqui só a forma é validada e `packages/ai` não é importado.
- **Contrato externo assumido — Motor de Duelo (`packages/engine`):** `initDuel` é consumido por
  F03, não por F01; esta feature só garante o formato do deck de NPC que torna a inicialização
  aceitável.
- **Pendência de dado externo — composição do roster.** Quais duelistas existem, seus decks de 40
  cartas, suas dificuldades, seus pools de drop e os pesos de raridade são dado de balanceamento
  ainda não fornecido (`arquitetura.md` §10). O arquivo de roster é entregue **vazio** e o caminho
  neutro é implementado e testado: roster vazio vira tela de estado vazio legível, e pool vazio
  vira lista vazia cujo fallback é decidido por F06. Nenhum valor é inventado.
- **Pendência de asset — retratos dos duelistas** não existem no repositório; a resolução é por
  caminho declarado com placeholder, sem ocultar o duelista.
- **Decisões a confirmar antes de codar** (registradas em Decisões e Premissas da spec, itens 2, 3
  e 15): convergência da tabela de drops com `banco-de-cartas` F08 para não criar duas fontes;
  a escala de três níveis de dificuldade derivada do exemplo do PRD; e a ausência de store global
  nesta feature, com a escolha entre Zustand e `useReducer`+context adiada para F03.
- **Fonte única das constantes de deck (item 18, já resolvido).** F01 declara o tamanho obrigatório
  do deck e o teto de cópias por carta em `packages/shared`, e `free-duel` F02 já as consome de lá.
  `build-deck` F01 não as declara — ela delega a validação de 40 cartas e do teto de 3 cópias à
  `build-deck` F06, que ainda não tem spec e deve consumir este mesmo arquivo em vez de criar um
  paralelo.

## Fase 1: Contratos do roster em `packages/shared`

**1. Constantes de deck compartilhadas** — Declarar em `shared` os dois invariantes da Fase 0 que
o roster reforça — tamanho obrigatório do deck e limite de cópias por carta — como fonte única
para todo o monorepo, a ser consumida também por `free-duel` F02 e por `build-deck` F06 em vez de
duplicada.

**2. Vocabulário de duelista** — Declarar em `shared` os tipos do domínio de duelista: o
identificador, o union fechado de níveis de dificuldade, o perfil de dificuldade consumido pela
IA, a faixa de raridade do pool e a forma do roster. Esses tipos passam a ser o contrato entre
dados, IA e interface.

**3. Schemas de validação do roster** — Definir em `shared` os schemas zod que descrevem o arquivo
de roster e cada duelista, com as regras de formato, tamanho e unicidade descritas na spec, além
do conjunto fechado de códigos de erro do subsistema. A existência das cartas no catálogo fica
fora do schema por depender de dado externo injetado.

## Fase 2: Loader e validação em `packages/data`

**4. Validação de um duelista** — Implementar a validação pura de um duelista contra o schema e
contra os invariantes da Fase 0, recebendo a consulta ao catálogo por injeção e devolvendo um
resultado cujo código identifica exatamente o motivo da reprovação.

**5. Carregamento e agregação do roster** — Implementar o loader puro que valida o envelope,
percorre os duelistas na ordem declarada, separa aprovados de ocultados sem interromper o lote,
resolve duplicidade de identificador e devolve o roster utilizável junto do relatório de
inconsistências.

**6. Consulta de duelista e de pool de drops** — Implementar as consultas que F03 e F06 vão
usar: obter o duelista escolhido por identificador e obter seu pool de drops por faixa, com
resposta vazia tratada como caminho válido e não como erro.

**7. Arquivo de dados do roster** — Criar o arquivo de roster versionado em git, entregue vazio e
válido, e documentar no próprio pacote que adicionar duelista é edição de dados. Nenhum duelista,
deck, dificuldade, pool ou peso é inventado.

**8. Script de validação no build** — Implementar o adaptador de linha de comando que lê o roster
e o catálogo, roda a validação, imprime o relatório legível e define o código de saída conforme a
integridade, e registrá-lo no grafo de tarefas do monorepo depois da ingestão de cartas para que
erro de balanceamento apareça no CI.

## Fase 3: Acesso e cache no cliente

**9. Cache local do roster validado** — Implementar o store local que guarda o último snapshot já
validado do roster e o invalida quando a versão ou o hash do bundle divergem, tolerando ambiente
sem armazenamento disponível sem derrubar o fluxo.

**10. Adaptador de carregamento na borda** — Implementar o adaptador que obtém o roster e o
catálogo, delega a validação ao loader do pacote de dados, grava o snapshot no cache em caso de
sucesso, recorre ao cache em caso de falha de leitura ou conteúdo corrompido, e sinaliza
separadamente os casos de origem em cache e de catálogo indisponível. É também o único ponto que
loga as inconsistências devolvidas pelo loader.

## Fase 4: Tela de seleção de oponente

**11. Tela de seleção** — Implementar a rota de Free Duel e o componente de seleção que lista os
duelistas disponíveis com retrato, nome e indicador de dificuldade, permite escolher um deles,
habilita a confirmação e navega para a etapa de preparação levando o duelista escolhido, sem
introduzir store global e sem qualquer escrita de dado do jogador.

**12. Estados degradados e acessibilidade** — Implementar os estados que a spec exige além do
caminho feliz de roster povoado: roster vazio com texto explícito e confirmação indisponível, aviso de
roster vindo do cache, bloqueio com nova tentativa quando o catálogo não carrega, e placeholder de
retrato ausente — tudo navegável por teclado e legível de 320 px a 1920 px.

**13. Portões de fronteira** — Configurar a análise estática que impede o núcleo do roster de
importar I/O ou interface, impede a camada web de reimplementar a validação ou repetir os limites
de deck, e impede esta feature de importar o pacote de IA, sustentando as fronteiras declaradas na
arquitetura.
