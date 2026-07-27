# Plano de Implementação — Edição do Deck Ativo

> Spec: `./spec.md`

## Pré-requisitos

- **`build-deck`/F01 — Coleção do Jogador (Baú).** Fornece `Colecao`, `quantidadePossuida`,
  `possui` e `limiteCopias` em `packages/rules/src/colecao`, reusados sem redefinição. Tem spec,
  ainda sem implementação.
- **`build-deck`/F02 — Geração do Deck Inicial no Cadastro.** Fornece o deck ativo inicial como
  `Colecao` via `garantirEntradaDuelo`/leitura de `active_decks`. F05 assume essa interface como
  pré-requisito de integração; tem spec, ainda sem implementação.
- **`build-deck`/F04 — Navegação e Filtro da Coleção.** Fornece `numeroSelecionado` e a interface
  `ConsultaDeckAtivo` (hoje atendida por um fallback neutro que devolve zero). F05 substitui esse
  fallback pela implementação real. Tem spec, ainda sem implementação.
- Nenhuma pendência de dado externo (guardião, terreno, fusão, drops, rating, balanceamento)
  bloqueia esta feature.

## Fase 1: Núcleo puro de edição do rascunho

**1. Tipos do rascunho** — Introduzir o alias do rascunho de deck e a união dos motivos de
bloqueio em `packages/shared`, reexportados no índice público do pacote.

**2. Adicionar carta ao rascunho** — Implementar a função que aplica as três checagens de
bloqueio (carta não possuída, além da posse, acima do teto de 3 cópias), reusando as funções de
posse e limite já existentes de F01 sem reimplementá-las.

**3. Remover carta do rascunho** — Implementar a função que decrementa a quantidade de uma carta
no rascunho e limpa a entrada quando chega a zero, com o bloqueio defensivo para quantidade já
nula.

**4. Consultas derivadas do rascunho** — Implementar o total de cartas do rascunho, a comparação
de divergência contra o deck ativo original, e a leitura de "quantidade no deck" que F04 vai
consumir no lugar do fallback neutro que usa hoje.

## Fase 2: Estado do editor no app

**5. Store do rascunho** — Criar o armazenamento de estado que guarda o deck ativo original e o
rascunho em edição, com as ações de inicializar a partir do deck ativo, adicionar, remover e
descartar alterações.

**6. Hook de leitura do editor** — Criar o adaptador fino que expõe o rascunho, o total, o último
bloqueio, a consulta de deck ativo e se há alteração não salva, injetando a coleção do jogador
internamente a partir de F01.

**7. Aviso de saída sem salvar** — Criar o mecanismo que avisa o navegador ao fechar ou recarregar
a aba quando há alteração não salva, e expõe a confirmação usada antes de navegar para fora do
editor.

## Fase 3: Integração de UI com F04

**8. Painel do deck em edição** — Construir o componente que lista as cartas do rascunho com a
ação de remover por carta e o contador de total.

**9. Ação de adicionar e mensagem de bloqueio** — Conectar a ação de adicionar do painel da
coleção (F04) ao rascunho, exibindo a mensagem específica quando uma tentativa for bloqueada.

**10. Fiação da página do Build Deck** — Inicializar o estado do editor a partir do deck ativo
assim que a página carrega, e injetar a consulta de deck ativo real no painel de coleção de F04 no
lugar do fallback que ele usa hoje.

**11. Guarda de navegação** — Interceptar a saída da rota do editor quando houver alteração não
salva, usando a confirmação criada na Fase 2.

## Fase 4: Fronteira e verificação

**12. Verificação de fronteira do pacote de regras** — Acrescentar aos verificadores estáticos do
projeto a regra que impede o novo subsistema de edição de deck de importar React, DOM, `fetch` ou
Supabase.
