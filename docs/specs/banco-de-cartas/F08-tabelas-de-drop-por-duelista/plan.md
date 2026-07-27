# Plano de Implementação — Tabelas de Drop por Duelista

> Spec: `./spec.md`

## Pré-requisitos

- **Depende de F03** (`packages/data/src/catalogo`, função `CatalogoCartas.getByNumero`), já com
  spec própria em `docs/specs/banco-de-cartas/F03-servico-de-catalogo-de-cartas/`. A implementação
  assume que o catálogo já carrega e valida a si mesmo antes de ser passado para esta feature.
- **Nenhum contrato externo cross-PRD é consumido.** F08 é dependência de saída para Campanha e
  Free Duel, nenhum dos dois com spec para a parte que consumiria esta tabela.
- **Roster de duelistas não existe.** O identificador de duelista é tratado como string opaca,
  definida por esta feature; o conjunto real de duelistas é contrato futuro de Campanha/Free Duel
  e não é validado aqui.
- **Pendência de dado externo (regra dura): os pools de drop por duelista não existem no
  repositório e não devem ser inventados.** A implementação entrega schema, loader e validação de
  referências de `numero`; o arquivo de configuração parte vazio e assim permanece até alguém
  fornecer os valores reais externamente.
- **A concessão do drop ao vencer um duelo não faz parte desta feature.** Nenhum sorteio, PRNG ou
  crédito de carta é implementado aqui — apenas a hospedagem consultável dos dados.

## Fase 1: Contratos e schema da tabela de drops

**1. Tipos do domínio de drops** — Declarar `DuelistaId`, `EntradaDrop`, `PoolDrop` e
`TabelaDropsPorDuelista` em `packages/data`, reaproveitando `NumeroCarta` já definido por F01, sem
adicionar nada em `packages/shared`.

**2. Schema de validação estrutural** — Definir os schemas zod que descrevem a forma de uma
entrada de drop, de um pool por duelista e do arquivo inteiro, incluindo as regras de
`probabilidade` positiva e `numero` no formato canônico.

**3. Arquivo de configuração inicial** — Criar o arquivo de dados hand-authored em
`packages/data/config/drop-tables.json`, hoje vazio, documentando que ele fica fora do
`.gitignore` de `packages/data/generated/` e é versionado normalmente enquanto aguarda os valores
reais.

## Fase 2: Núcleo puro de validação e agregação

**4. Validação estrutural do conteúdo bruto** — Implementar o parse do array bruto do arquivo de
configuração contra o schema, tratando array vazio como caso válido e qualquer outra violação
estrutural como rejeição explícita do arquivo inteiro.

**5. Agregação por duelista e detecção de duplicata** — Implementar o agrupamento das pools
validadas num mapa indexado por duelista, abortando com erro explícito quando dois pools
compartilham o mesmo identificador.

**6. Validação de referências de `numero` contra o catálogo** — Implementar a checagem que
percorre cada entrada de cada pool e confere a existência do `numero` no catálogo de cartas (F03),
coletando todas as violações encontradas em vez de parar na primeira.

**7. Orquestrador da tabela de drops** — Compor as três checagens anteriores numa função única que
recebe o conteúdo bruto e o catálogo já carregado, trata a ausência/vazio do arquivo como tabela
vazia sem erro, congela o resultado e expõe a superfície pública de consulta por duelista, listagem
de duelistas com pool e listagem de todos os pools.

## Fase 3: Adaptador de I/O e verificação

**8. Adaptador de carregamento do disco** — Implementar a função que lê o arquivo de configuração
do caminho informado, trata a ausência do arquivo como o mesmo caminho neutro do núcleo puro, e
propaga falha explícita apenas quando o arquivo existe mas é ilegível ou malformado.

**9. Verificação de fronteira de pacote** — Estender a análise estática de F01/F02/F03 para cobrir
o novo subsistema de drops, confirmando que só o adaptador de carregamento toca filesystem e que
`packages/data` continua importando apenas `packages/shared` e seu próprio subsistema de catálogo.

**10. Verificação de aceite contra o estado atual** — Executar a tabela de drops sobre o catálogo
real (F01+F02+F03) e o arquivo de configuração vigente, confirmando que ela carrega vazia hoje, que
qualquer referência de `numero` inexistente é rejeitada, que duelista duplicado é rejeitado, e
registrando explicitamente o critério de aceite bloqueado até os valores reais de drop serem
fornecidos.
