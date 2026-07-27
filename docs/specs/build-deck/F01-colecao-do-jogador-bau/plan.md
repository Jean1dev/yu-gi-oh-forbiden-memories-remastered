# Plano de Implementação — Coleção do Jogador (Baú)

> Spec: `./spec.md`

## Pré-requisitos

- **Scaffolding do monorepo** criado por `banco-de-cartas`/F01 (pnpm workspaces, Turborepo,
  TypeScript strict, Node.js 24 LTS, portões de fronteira por análise estática). Esta feature
  acrescenta pacotes a essa base; não a recria.
- **Contratos canônicos de carta em `packages/shared`** — também de `banco-de-cartas`/F01. São
  reusados, nunca redefinidos.
- **Contrato externo — serviço de catálogo (`banco-de-cartas`/F03).** Ainda não existe. A regra
  pura o consome por injeção e os testes usam um catálogo falso em memória; a interface esperada
  está na Seção 4 da spec. Sem ele, a coleção não pode ser exibida — o comportamento é falha
  explícita, nunca coleção vazia.
- **Contrato externo — Auth/Cadastro.** Ainda não existe. Fornece a sessão autenticada da qual
  sai o identificador do jogador, que é a chave da coleção e o eixo da política de segurança.
- **Projeto Supabase acessível** com Auth habilitada e um caminho de migração local para rodar os
  testes de integração.
- **Premissa a confirmar:** esta feature amplia o charter de `packages/rules`, hoje descrito em
  `docs/arquitetura.md` §2 como Guardian Star / Terrain / Fusion / Effect System, para também
  abrigar regra de montagem de baralho. Atualizar §2 antes ou junto da implementação.
- **Sem pendência de dado externo.** Nenhuma tabela de guardiões, terrenos, fusões, drops, rating
  ou balanceamento é consumida aqui. O pool inicial de balanceamento é pendência de F02.

## Fase 1: Contratos da coleção

**1. Contratos em `shared`** — Definir os tipos e schemas de validação que descrevem a coleção
nas suas três formas: em memória, em transporte/cache e como linha vinda do banco. Reusar os
contratos canônicos de carta já existentes no pacote e reexportar os novos no export público.

**2. Contrato de consulta ao catálogo** — Declarar em `shared` a interface pela qual a regra
obtém os dados de uma carta a partir do seu número, marcada como implementada por
`banco-de-cartas`/F03. É o que permite escrever e testar toda a regra antes daquele módulo
existir.

## Fase 2: Regra pura de posse

**3. Pacote `rules`** — Criar o pacote com dependência apenas em `shared`, seu README de
propósito e fronteira, e registrá-lo nos portões de análise estática para que a proibição de
importar UI, rede e armazenamento passe a valer desde a primeira linha.

**4. Conversão entre as formas da coleção** — Implementar a ida e volta entre a forma em memória
e a forma serializável, com ordenação estável, para que o cache local seja um espelho fiel e
verificável do dado do servidor.

**5. Regras de posse** — Implementar as consultas de posse e o cálculo do teto de cópias por
carta, que combina o invariante de jogo (máximo 3) com o piso da quantidade possuída. É a única
fonte desse número em todo o projeto.

**6. Enriquecimento com o catálogo** — Cruzar a coleção com o catálogo injetado, produzindo a
lista ordenada de itens possuídos e, separadamente, os números sem carta correspondente, que são
ocultados e reportados em vez de interromper o carregamento.

**7. Leitura booleana para o Library** — Derivar da mesma estrutura o conjunto de cartas obtidas,
que é o formato que o módulo Library espera. Uma fonte de dado, dois consumos.

## Fase 3: Persistência e cache local

**8. Migração da coleção** — Criar a tabela de coleção com a chave que garante uma única
quantidade por carta por jogador, as restrições que impedem quantidade inválida ou número
malformado, e o vínculo com a conta que remove a coleção quando a conta é removida.

**9. Política de acesso** — Habilitar a segurança em nível de linha e conceder ao jogador
autenticado apenas a leitura das próprias linhas, deixando deliberadamente sem política as
operações de escrita — elas chegarão por funções com autoridade de servidor nas features que as
originam.

**10. Cache local da coleção** — Implementar o armazenamento local que guarda a coleção inteira
de um jogador como um único registro, junto do carimbo de quando ela veio do servidor, com
substituição integral a cada leitura bem-sucedida e validação do que é lido de volta.

## Fase 4: Carregamento no app web

**11. Leitura remota** — Implementar o acesso à coleção no Supabase a partir da sessão
autenticada, validando a resposta na fronteira e descartando com registro qualquer linha fora do
domínio, sem derrubar o carregamento inteiro.

**12. Orquestração do carregamento** — Combinar leitura remota, gravação do cache e recurso ao
cache numa única entrada que sempre informa a procedência do dado e o quanto ele está velho.
Ausência simultânea de servidor e de cache resulta em falha explícita, nunca em coleção vazia.

**13. Consumo na interface** — Expor o carregamento à camada React por um adaptador fino que
apenas reflete carregando, pronta ou falha, sem conter regra e sem fixar uma escolha de store
global — essa decisão fica para a edição do deck, onde haverá estado mutável para justificá-la.
