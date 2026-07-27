# Plano de Implementação — Acesso à Coleção do Jogador

> Spec: `./spec.md`

## Pré-requisitos

- **Scaffolding do monorepo** criado por `banco-de-cartas`/F01 (pnpm workspaces, Turborepo,
  TypeScript strict, Node.js 24 LTS, portões de fronteira por análise estática). Esta feature
  acrescenta subsistemas a essa base; não a recria.
- **Pacotes `rules` e `web`** criados por `build-deck`/F01. Esta feature acrescenta o subsistema
  `library` a ambos.
- **Contratos canônicos de carta em `packages/shared`** — de `banco-de-cartas`/F01. São reusados,
  nunca redefinidos.
- **Contrato externo — serviço de catálogo (`banco-de-cartas`/F03).** Ainda não existe. Além do
  acesso por número que `build-deck`/F01 já declarou, esta feature exige a **listagem completa do
  dataset selado e a contagem canônica**, sem as quais não há como enumerar as cartas do jogo nem
  derivar o "de 722" do indicador. A interface esperada está na Seção 4 da spec; até lá, os testes
  usam um catálogo falso em memória.
- **Contrato externo — resolução de artes (`banco-de-cartas`/F04).** Ainda não existe. Fornece a
  referência de imagem a partir do número da carta e o placeholder para arquivo ausente. A Library
  nunca monta caminho de arte por conta própria.
- **Contrato externo — coleção do jogador (`build-deck`/F01).** Tem spec, não tem implementação.
  Fornece o carregamento da coleção, sua procedência (servidor ou cache) e a derivação do conjunto
  de cartas obtidas — que aquela spec já declara como contrato oferecido à Library. Nenhum caminho
  de leitura de coleção é duplicado aqui.
- **Contrato externo — Auth/Cadastro.** Ainda não existe. Sem sessão autenticada o carregamento da
  coleção falha, e a Library exibe a mensagem de coleção indisponível.
- **Projeto Supabase acessível** com a migração da coleção aplicada, para os testes de integração.
- **Premissa a confirmar:** a ampliação do charter de `packages/rules` para além de Guardian
  Star / Terrain / Fusion / Effect System, aberta por `build-deck`/F01, continua pendente de
  registro em `docs/arquitetura.md` §2. Esta feature acrescenta um segundo subsistema àquele
  pacote e reforça a necessidade do registro.
- **Sem pendência de dado externo.** Nenhuma tabela de guardiões, terrenos, fusões, drops, rating
  ou balanceamento é consumida. Os guardiões aparecem apenas como rótulos, sem cálculo.

## Fase 1: Contratos da Library

**1. Contratos de entrada e índice em `shared`** — Definir a entrada da Library como união
discriminada por status de posse, de modo que a variante bloqueada não possua os campos da carta,
e o índice que a acompanha com suas duas visões — a sequência ordenada e o acesso por identidade —
mais as contagens de progresso. Reusar os contratos canônicos de carta já existentes no pacote.

**2. Contrato de referência de arte** — Declarar as três situações possíveis de imagem de uma
carta na Library: arte resolvida, ausência de arquivo e carta bloqueada. Apenas a primeira carrega
uma referência concreta; as outras duas deixam a escolha do asset para a camada de apresentação.

**3. Contratos de consulta ao catálogo e às artes** — Declarar em `shared` as interfaces pelas
quais a regra obtém a listagem completa do dataset, a contagem canônica e a referência de imagem
de uma carta, marcadas como implementadas por `banco-de-cartas`. É o que permite escrever e testar
todo o cruzamento antes daquele módulo existir.

**4. Validação de fronteira** — Definir os schemas de validação correspondentes, incluindo a
recusa explícita de uma entrada bloqueada que traga campos da carta e a verificação de que a
contagem de obtidas nunca ultrapassa o total.

## Fase 2: Regra pura de cruzamento

**5. Subsistema `library` em `rules`** — Criar o subsistema ao lado do de coleção, atualizar o
README do pacote e registrar nos portões de análise estática que este código não pode importar
interface, rede, armazenamento nem relógio.

**6. Escolha da referência de arte** — Implementar a decisão entre arte resolvida, placeholder e
silhueta, garantindo que uma carta não obtida nunca chegue a consultar o resolvedor — não há
caminho a resolver quando a carta está bloqueada.

**7. Cruzamento catálogo × obtidas** — Percorrer a listagem completa do catálogo, classificar cada
carta pelo conjunto de cartas obtidas, anexar a referência de arte, ordenar pela ordenação padrão
do módulo e montar as duas visões do índice sobre os mesmos objetos.

**8. Contagens e números órfãos** — Derivar o total do próprio catálogo, em vez de uma constante
local, e contabilizar as obtidas. Números possuídos que não existem no catálogo são separados,
registrados e mantidos fora da contagem, para que o indicador de progresso não possa exceder o
total do jogo.

**9. Acesso e progresso** — Expor a consulta de uma entrada por número, o predicado de posse e o
par de contagens que o indicador de progresso consome, com resposta explícita para número
inexistente em vez de um registro vazio.

## Fase 3: Carregamento no app web

**10. Acesso ao catálogo** — Implementar a obtenção do catálogo selado e do resolvedor de artes,
memoizados por processo, já que ambos são imutáveis em execução. Catálogo indisponível ou não
selado como válido é falha explícita, e nesse caso a coleção nem chega a ser consultada.

**11. Orquestração do carregamento** — Combinar catálogo, carregamento da coleção reusado do Build
Deck e o cruzamento puro numa única entrada, que devolve o índice junto da procedência do dado e
do quanto ele está velho. Falha na coleção resulta em erro explícito, nunca num índice com todas
as cartas marcadas como não obtidas.

**12. Consumo na interface** — Expor o carregamento à camada React por um adaptador fino que
reflete carregando, pronta ou falha e oferece a ação de recarregar, sem conter regra e sem fixar
uma escolha de store global — essa decisão fica para a busca e os filtros, onde haverá estado
mutável para justificá-la. Releituras concorrentes resolvem-se pela mais recente, sem índice
meio-atualizado.

**13. Portões de fronteira** — Acrescentar aos verificadores de análise estática as regras que
impedem o subsistema da Library de importar I/O, que proíbem qualquer arquivo do módulo de ler a
origem bruta de cartas ou de montar caminho de imagem por concatenação, que vedam a contagem total
do jogo como literal, e que garantem que nenhuma escrita na coleção parta daqui.
