# Resolução de Pares e Sequências

## 1. Contexto e Escopo

Implementa a Foundation do Fusion System e resolve a pendência de dados de `banco-de-cartas/F05`: uma fonte compacta, um compilador determinístico para 50.242 pares explícitos e um resolvedor sequencial puro. Segue `docs/arquitetura.md` §§1–4, ADR-003 e ADR-008.

### Incluído
- Fonte estruturada de regras, categorias secundárias, precedências e receitas exatas.
- Compilação/validação contra o catálogo canônico e artefato `fusions.json` versionado.
- Lookup simétrico e resolução ordenada de 2–5 cartas.

### Adiado
- Integração com estado, ações e UI (F02/F03).

### Decisões e Premissas
- `docs/fusoes.md` é referência humana; JSONs estruturados são a fonte executável.
- Categorias ambíguas usam listas explícitas auditadas contra o commit upstream `be2a752bfa484a04c52b5b4bef6bed22d1a8fcf7`.
- O artefato contém somente receitas `materials`; regras de classe são expandidas no build.
- Pares são canônicos por `numero`, receitas de glitch são excluídas e o resultado deve totalizar 50.242.
- `rules` recebe lookup e catálogo por interfaces de `shared`, respeitando a fronteira executável atual.

## 2. Alocação no Monorepo

- `packages/data/rules-data/fusion-rules.json` e `fusion-secondary-types.json`: fonte compacta.
- `packages/data/rules-data/fusions.json`: artefato explícito, ordenado e versionado.
- `packages/data/src/fusion-source/*`: schemas, expansão e validação puras.
- `packages/data/scripts/build-fusions.ts`: I/O e CLI.
- `packages/shared/src/fusion/*`: contratos serializáveis e portas de lookup.
- `packages/rules/src/fusion/*`: lookup em memória e resolvedor sequencial.
- `turbo.json`, manifests e READMEs: pipeline/exports.

`data` importa apenas `shared`; `rules` importa apenas `shared`; nenhum núcleo puro acessa filesystem, rede, relógio ou UI.

## 3. Design Técnico

A fonte compacta descreve seletores (`primary_class`, `secondary_type`, `cards`), ladders de resultados e precedências explícitas. O compilador expande candidatos sobre 722 cartas, aplica o limite estrito de ATK quando indicado, resolve conflitos por ordem topológica e sobrepõe receitas exatas. O par ordenado lexicograficamente é a chave única.

O resolvedor inicia com a primeira carta. Para cada material seguinte, substitui o acumulador pelo resultado conhecido; sem receita, registra falha e usa o material seguinte como acumulador. A saída contém materiais, etapas e carta final, todos imutáveis.

## 4. Contratos

- `FusionLookupEntry = readonly [CardNumber, CardNumber, CardNumber]`.
- `FusionPairLookup = (left, right) => CardNumber | undefined`.
- `FusionStep`: união `fused` com resultado ou `not_fused` com sobrevivente.
- `FusionResolution`: materiais, etapas e resultado final.
- `FusionResolver`: recebe `readonly Card[]` e devolve `Result<FusionResolution, DomainError>`.
- `createFusionPairLookup(entries)` e `resolveFusionSequence(materials, { pairLookup, cardLookup })`.

## 5. Modelo de Dados

`fusions.json` permanece no schema de F05 (`{kind:"materials",materials:[A,B],result}`), ordenado por A/B. `fusion-manifest.json` registra `recipeCount`, `sha256` e `sourceRevision`. O manifesto é gerado e versionado ao lado da fonte; nenhum dado é persistido em Postgres.

## 6. Tratamento de Erros e Casos de Borda

- Fonte/schema inválido, selector vazio, ciclo de precedência, carta desconhecida ou conflito não resolvido abortam o build.
- Contagem diferente de 50.242 aborta o build.
- Menos de 2 ou mais de 5 materiais retorna `invalid_fusion_material_count`.
- Resultado presente na tabela mas ausente no catálogo retorna `fusion_result_not_found`.
- Lookup sem receita é resultado normal, não erro.

## 7. Estratégia de Testes

- Unitários para selectors, ATK estrito, precedência, exatas, simetria e exclusão de glitch.
- Integração real exige 50.242 pares, zero rejeições e regeneração idêntica.
- Property-based prova determinismo, imutabilidade e equivalência A+B/B+A.
- Testes sequenciais cobrem sucesso encadeado, falha intermediária e limites 2/5.

