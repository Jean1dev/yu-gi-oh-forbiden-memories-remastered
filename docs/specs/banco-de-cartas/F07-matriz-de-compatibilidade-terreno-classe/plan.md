# Plano de Implementação — Matriz de Compatibilidade Terreno↔Classe

> Spec: `./spec.md`

## Pré-requisitos

- **Depende de F03** (`CatalogoCartas`, já com spec própria em `docs/specs/banco-de-cartas/`), usada
  para derivar em tempo de execução o conjunto de classes de monstro conhecidas. A implementação
  assume que F01/F02/F03 já rodam e que um `CatalogoCartas` carregado está disponível para compor.
- **Pendência de dado externo, não bloqueia a implementação:** os valores reais de fortalecimento/
  enfraquecimento/magnitude por classe/terreno não existem no repositório e não são inventados
  aqui. A tabela hospedada embarca vazia (`[]`) até fornecimento externo — a implementação inteira
  deve funcionar corretamente com essa entrada vazia.
- **Nenhum contrato externo cross-PRD é implementado aqui.** F07 declara os dados que um futuro PRD
  de Terrain Engine (`packages/rules/src/terrain`) e o `ProvedorModificadorTerreno` já declarado por
  `motor-duelo-1x1` F04 vão consumir, sem implementar nenhum dos dois lados.
- **F09 (Distribuição), ainda não especificada,** é quem empacotará o arquivo de dados desta
  feature no bundle offline/servidor — tratado como consumidor futuro, não como pré-requisito.

## Fase 1: Contrato de dados e schema

**1. Tipos e schema da entrada do mapeamento** — Declarar a forma de uma regra terreno→classe
(terreno, classes fortalecidas, classes enfraquecidas, as duas magnitudes) e o schema que a valida
estruturalmente, reaproveitando os tipos de erro já definidos por F01.

**2. Tipos públicos do subsistema** — Declarar a interface pública de consulta (a tabela
construída, o resultado de classificação, o relatório de cobertura e a violação) que os
consumidores internos e o futuro Terrain Engine vão programar contra.

**3. Arquivo de dados hospedado** — Criar, versionado em git, o arquivo de dados que hospeda o
mapeamento no local que o schema espera, hoje vazio.

## Fase 2: Núcleo de validação e consulta

**4. Validação estrutural** — Implementar a checagem de cada entrada do arquivo bruto contra o
schema, acumulando toda violação encontrada sem interromper o lote.

**5. Detecção de terreno duplicado e de classe contraditória** — Implementar as duas checagens de
conjunto que bloqueiam a construção da tabela quando a mesma chave de terreno se repete, ou quando
uma classe é simultaneamente fortalecida e enfraquecida no mesmo terreno.

**6. Derivação das classes de monstro conhecidas** — Implementar a filtragem do catálogo real por
tipo monstro antes de coletar o conjunto de classes distintas, evitando misturar os rótulos de
não-monstro que reaproveitam o mesmo campo `classe` do schema canônico.

**7. Validação de referência de classe** — Implementar a checagem que bloqueia qualquer classe
citada no mapeamento que não pertença ao conjunto de classes de monstro derivado no passo anterior.

**8. Cálculo de cobertura de classes** — Implementar o relatório, não bloqueante, das classes
conhecidas que ainda não aparecem em nenhuma entrada do mapeamento.

**9. Composição do núcleo puro** — Implementar o orquestrador que aplica as etapas 4–8 na ordem
descrita na spec, decide se a tabela pode ser construída, monta o índice por terreno, congela o
resultado e expõe a consulta de classificação com o fallback neutro embutido para qualquer par
terreno/classe fora da tabela.

## Fase 3: Adaptador de I/O e integração ao build

**10. Loader a partir do disco** — Implementar a função que lê o arquivo de dados desta feature,
recebe um catálogo já carregado (reaproveitando o loader de F03) e delega ao núcleo puro.

**11. Script de validação para CI/local** — Implementar o adaptador de linha de comando que
compõe o carregamento do catálogo e da matriz, imprime o resumo de violações e de cobertura, e
define o exit code respeitando a distinção entre bloqueio (estrutura/duplicidade/contradição/
referência) e pendência não bloqueante (cobertura incompleta) descrita na spec.

**12. Integração ao Turborepo** — Registrar a nova tarefa de validação desta feature com a
dependência correta em relação às tarefas já existentes de ingestão e validação do catálogo.

## Fase 4: Testes e verificação de aceite

**13. Testes unitários table-driven** — Cobrir cada checagem do núcleo e a tabela pública,
incluindo os casos de borda de estrutura, duplicidade, contradição, referência e classificação
neutra listados na spec.

**14. Testes property-based** — Cobrir a propriedade de cobertura como complemento exato do
conjunto coberto, a neutralidade garantida para qualquer par fora da tabela, e a impossibilidade de
uma classe contraditória sobreviver à construção.

**15. Testes de integração** — Validar o carregamento contra o catálogo real (F01+F02+F03) e o
arquivo de dados real (hoje vazio), incluindo o comportamento do script de validação com exit code.

**16. Verificação final contra os critérios de aceite** — Confrontar a implementação com os
critérios do PRD §9 F07 e com os testes de integração cross-feature/cross-PRD da spec, distinguindo
explicitamente o que já está satisfeito pelo schema/loader/validação entregues do que permanece
bloqueado pela pendência de dado externo.
