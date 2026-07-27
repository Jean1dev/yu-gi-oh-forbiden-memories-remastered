# Plano de Implementação — Matriz de Compatibilidade de Guardiões Estelares

> Spec: `./spec.md`

## Pré-requisitos

- **Depende de F03 (Serviço de Catálogo de Cartas)**, que já tem spec em
  `docs/specs/banco-de-cartas/F03-servico-de-catalogo-de-cartas/`. A implementação assume que F03
  já expõe a consulta por guardião e o carregamento do catálogo real a partir do disco.
- **Nenhum contrato externo cross-PRD é implementado aqui.** O Guardian Star Engine e o Motor de
  Duelo 1x1 são dependências de saída — a spec já fixa o contrato que eles consumirão quando
  existirem, sem exigir nenhuma implementação deles nesta feature.
- **Pendência de dado externo:** os valores reais da matriz de vantagem/desvantagem/bônus entre os
  10 Guardiões Estelares ainda não foram fornecidos. A implementação parte de uma fonte vazia e
  deve permanecer funcional e schema-válida nesse estado — nenhuma etapa deste plano espera ou
  simula valores reais.

## Fase 1: Contratos e fonte de dados em `packages/data`

**1. Tipos e schema da entrada da matriz** — Declarar a forma de uma entrada da matriz (par
ordenado de guardiões, resultado categórico e magnitude de bônus) e o schema zod correspondente,
reaproveitando o tipo de guardião já definido por F01.

**2. Normalização e coerência de uma entrada** — Implementar a validação de uma entrada bruta
isolada, incluindo a regra de coerência entre o resultado categórico e a magnitude do bônus
descrita na spec.

**3. Arquivo fonte versionado** — Criar o arquivo de dados autoral que o mantenedor vai editar
para inserir os valores reais no futuro, com o estado inicial vazio já schema-válido.

## Fase 2: Núcleo puro de construção e consulta

**4. Construção indexada da matriz** — Implementar a montagem da matriz a partir do array bruto da
fonte: reparse tudo-ou-nada de cada entrada, rejeição de pares duplicados, indexação por par
ordenado e congelamento do resultado.

**5. Função de consulta total** — Implementar a consulta guardião×guardião que nunca lança e
devolve o fallback neutro documentado na spec quando o par consultado não tiver entrada própria.

**6. Exportação pública do subsistema** — Consolidar os módulos desta feature num ponto de entrada
único, pronto para ser consumido por outros pacotes do monorepo quando precisarem da matriz.

## Fase 3: Integração com o catálogo real e relatório de cobertura

**7. Derivação do conjunto real de guardiões usados** — Implementar a consulta ao catálogo real
(F03) que produz a lista de guardiões efetivamente presentes nas cartas, sem depender de nenhuma
lista fixa em código.

**8. Relatório de cobertura** — Implementar a verificação, sobre o conjunto real de guardiões
usados, de quais pares ordenados têm entrada na matriz e quais estão faltando, sem que a
incompletude bloqueie o processo.

**9. Adaptador de build** — Implementar o script que orquestra a leitura da fonte, o carregamento
do catálogo real, a construção da matriz, o cálculo do relatório de cobertura, a escrita dos
artefatos gerados e a impressão do resumo esperado pela Experience do PRD.

## Fase 4: Integração no build e verificação

**10. Integração no grafo de build do Turborepo** — Registrar esta feature como tarefa dependente
da ingestão e da validação do catálogo, com entradas e saídas declaradas para aproveitar cache e
garantir que o carregamento do catálogo real sempre veja artefatos atualizados.

**11. Verificação de fronteira de pacote** — Estender a análise estática já usada por F01/F02/F03
para cobrir o novo subsistema, garantindo que apenas o adaptador de build toque filesystem e que
`packages/data` continue importando somente `packages/shared`.

**12. Fixtures e cobertura de testes** — Criar as fontes sintéticas necessárias e os testes
unitários, de propriedade e de integração descritos na spec, cobrindo tanto os erros estruturais
quanto o caminho neutro de cobertura incompleta.

**13. Verificação de aceite contra o estado real** — Executar o build desta feature contra a fonte
vazia atual e o catálogo real de F01/F02/F03, confrontando o resultado com os critérios de aceite
do PRD que não dependem dos valores pendentes, e registrando explicitamente que o critério de
fidelidade à tabela clássica permanece bloqueado até a tabela real ser fornecida.
