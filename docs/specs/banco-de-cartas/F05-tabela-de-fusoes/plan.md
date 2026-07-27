# Plano de Implementação — Tabela de Fusões

> Spec: `./spec.md`

## Pré-requisitos

- **Depende de F03** (`CatalogoCartas`, já com spec própria em
  `docs/specs/banco-de-cartas/F03-servico-de-catalogo-de-cartas/`). A implementação assume que o
  catálogo já carrega e expõe `getByNumero` e `contagemPorClasse`.
- **Depende transitivamente de F01/F02** através do catálogo — os artefatos `cards.json`,
  `arts-manifest.json` e `dataset-seal.json` precisam existir e estar selados como válidos.
- **Nenhum contrato externo cross-PRD é consumido.** F05 é dependência de saída para o Fusion
  System e o Motor de Duelo 1x1, ambos ainda sem spec própria.
- **Pendência de dado externo:** a lista real de receitas de fusão do Forbidden Memories não
  existe no repositório e não será inventada nesta implementação. O trabalho entrega schema,
  loader e validação; a tabela roda com um arquivo semente vazio (`[]`) até o mantenedor fornecer
  os valores. Enquanto isso, toda consulta deve devolver "sem fusão conhecida" — esse é o
  comportamento correto, não uma lacuna a preencher.

## Fase 1: Schema e arquivo semente

**1. Tipos e schema da receita de fusão** — Declarar as duas formas de receita (por par de
materiais e por par de classes) como uma união discriminada, junto do tipo público da tabela
consultável e do formato do relatório de rejeições, conforme a spec.

**2. Arquivo de dados semente** — Criar o arquivo de fusões versionado em git com uma lista vazia,
na localização definida pela spec, documentando no próprio repositório que ele é o ponto de
entrada para o mantenedor preencher os valores reais no futuro.

## Fase 2: Núcleo puro de validação e indexação

**3. Canonicalização de pares** — Implementar a função que normaliza um par de valores (materiais
ou classes) numa chave estável, independente da ordem em que os dois lados são informados.

**4. Validação de receita individual contra o catálogo** — Implementar a checagem que confirma,
para cada receita já aprovada pelo schema, que os `numero` de materiais e resultado existem no
catálogo, e que as classes referenciadas em regras por-classe também existem.

**5. Indexação e detecção de duplicatas** — Implementar a construção dos três índices (par de
materiais, par de classes, por resultado) a partir das receitas validadas, excluindo e reportando
qualquer par canônico que apareça em mais de uma receita com resultados divergentes.

**6. Orquestrador da tabela de fusões** — Compor a leitura do array bruto, a validação de schema,
a validação contra o catálogo e a indexação num único fluxo que nunca aborta por causa de uma
receita isolada, produzindo a tabela consultável e o relatório de rejeições juntos.

**7. Consulta pública da tabela** — Expor as funções de busca por par de materiais, por par de
classes, por carta-resultado, a listagem completa e as contagens, todas operando sobre os índices
já prontos.

## Fase 3: Adaptador de I/O e integração com o pipeline de dados

**8. Adaptador de carregamento do disco** — Implementar a função que lê o arquivo de fusões do
caminho configurado, exige um catálogo já carregado como dependência, delega ao núcleo puro e
escreve o relatório de rejeições no diretório gerado.

**9. Script de build/CLI** — Expor o carregamento e a validação como uma tarefa executável que
carrega o catálogo (via F03), roda a tabela de fusões sobre o arquivo real e imprime um resumo
legível, seguindo o mesmo padrão dos scripts de ingestão e validação já existentes.

**10. Verificação de fronteira de pacote** — Estender a análise estática já usada por F01/F02/F03
para cobrir o novo subsistema, confirmando que só o adaptador de carregamento toca filesystem e
que `packages/data` continua importando apenas `packages/shared`.

## Fase 4: Verificação do caminho neutro e de aceite

**11. Teste do caminho neutro com a tabela vazia** — Confirmar, contra o seed atual e o catálogo
real, que toda consulta devolve "sem fusão conhecida" sem lançar erro — é o contrato que um
futuro Fusion System vai depender enquanto a pendência de dado não é resolvida.

**12. Verificação de aceite contra o catálogo real** — Rodar a tabela de fusões com fixtures
sintéticas de receitas válidas e inválidas sobre o catálogo real produzido por F01–F03,
confrontando o resultado com os critérios de aceite do PRD que não dependem dos valores reais de
fusão.
