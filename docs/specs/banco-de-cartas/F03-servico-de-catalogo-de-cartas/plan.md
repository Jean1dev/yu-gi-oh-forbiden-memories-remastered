# Plano de Implementação — Serviço de Catálogo de Cartas

> Spec: `./spec.md`

## Pré-requisitos

- **Depende de F01** (dataset canônico `cards.json` e manifesto `arts-manifest.json`) **e F02**
  (selo `dataset-seal.json`), ambos já com spec própria em `docs/specs/banco-de-cartas/`. A
  implementação assume que os dois já rodam e emitem seus artefatos em
  `packages/data/generated/`.
- **Nenhum contrato externo cross-PRD é consumido.** F03 é dependência de saída para Library,
  Build Deck, Motor de Duelo 1x1 e Password.
- **O carregamento no navegador (via bundle empacotado) não faz parte desta feature.** F03 entrega
  o núcleo puro (`criarCatalogo`) e um loader concreto só para Node.js. O loader do lado do
  navegador é uma dependência futura de F09 (Distribuição) e da integração em `apps/web`,
  registrada como pendência em Decisão 2 da spec.
- **Reconcilia uma inconsistência interna do PRD** (Decisão 5 da spec): o manifesto de artes é
  carregado e exposto por F03, não só por F01, para que F04 não precise repetir a leitura de
  disco.

## Fase 1: Contrato e tipos do catálogo

**1. Tipos do catálogo e do resultado de busca por senha** — Declarar a interface pública que os
consumidores vão programar contra (`CatalogoCartas`) e a união discriminada que distingue senha
mal formada de senha desconhecida, reaproveitando os tipos de carta já definidos por F01/F02.

## Fase 2: Núcleo puro de índices e consulta

**2. Índice primário por número** — Implementar a estrutura que mapeia cada `numero` à carta
correspondente, base da consulta de identidade em tempo constante.

**3. Índices secundários por tipo, classe, guardião e senha** — Implementar o agrupamento das
cartas por `tipo`, `classe`, cada um dos dois guardiões e `password`, preservando a ordem
determinística de `numero` crescente dentro de cada grupo.

**4. Contagens canônicas pré-computadas** — Implementar o cálculo, num único passe sobre o
dataset, da contagem total e das contagens por `tipo` e por `classe`, para que as consultas de
contagem nunca recomputem nada.

**5. Checagem do selo e composição do núcleo puro** — Implementar `criarCatalogo`: recusa
construir qualquer índice quando o selo não for válido, reparseia o dataset de forma tudo-ou-nada
contra o schema canônico, monta os índices e as contagens, congela cada carta e cada estrutura
exposta, e compõe o objeto público de consulta.

**6. Exposição do manifesto de artes** — Incluir o manifesto recebido na construção como parte do
objeto público do catálogo, sem nenhuma lógica de fallback, para que F04 o consuma sem ler o disco
de novo.

## Fase 3: Adaptador de I/O e verificação

**7. Adaptador de carregamento a partir do disco** — Implementar a função que lê os três
artefatos gerados por F01/F02 do diretório configurado e delega ao núcleo puro, propagando
qualquer ausência ou ilegibilidade de arquivo como falha explícita antes mesmo de checar o selo.

**8. Verificação de fronteira de pacote** — Estender a análise estática de F01/F02 para cobrir o
novo subsistema de catálogo, garantindo que só o adaptador de carregamento toque filesystem e que
`packages/data` continue importando apenas `packages/shared`.

**9. Testes de performance contra o dataset real** — Medir, sobre a saída real de F01 e F02, a
latência de `getByNumero`, das listagens por critério e do carregamento completo, confrontando com
os limites de 1ms, 50ms e 500ms do PRD.

**10. Verificação de aceite contra a fonte real** — Executar o catálogo sobre o dataset real e
confrontar com os critérios de aceite do PRD: recusa de selo inválido, contagem canônica 722,
imutabilidade estrutural e as consultas por critério usadas pelos módulos cross-PRD já
especificados.
