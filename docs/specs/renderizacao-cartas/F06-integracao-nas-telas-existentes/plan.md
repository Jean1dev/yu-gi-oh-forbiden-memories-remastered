# Plano de Implementação — Integração nas Telas Existentes

> Spec: `./spec.md`

## Pré-requisitos
- `renderizacao-cartas/F01` a `F05` implementadas e commitadas
- Nenhum contrato externo cross-PRD

## Fase 1: Plumbing de catálogo e rota

**1. Segundo manifesto no catálogo** — estender `CardCatalog`/`createCatalog`/`load-catalog-from-disk.ts`
com `getCropArtManifest()`, espelhando `getArtManifest()`.

**2. Rota de arte crop** — criar `apps/web/src/app/cards-data/art/[file]/route.ts`, mesmo padrão da rota
existente, apontando para `cards-data/art/`.

**3. Testes de catálogo** — cobrir os casos novos da Seção 7 da spec.

## Fase 2: Peças compartilhadas de apresentação

**4. Dispatcher CardFrame** — criar `apps/web/src/components/card-frame/card-frame.tsx`, escolhendo
`MonsterCardFrame`/`SpellTrapCardFrame` por `card.tipo`.

**5. Regra de fallback** — criar `apps/web/src/lib/card-frame/should-use-card-frame.ts`.

**6. Testes** — cobrir os casos da Seção 7 da spec para as duas peças.

## Fase 3: Integração na Library

**7. `LibraryEntry.cropArt`** — estender o tipo e o schema em `packages/shared`.

**8. Carregador e componentes** — resolver `cropArt` em `catalog-library.ts`; usar `CardFrame`/fallback em
`CardCell` e `CardDetail`.

**9. Verificação visual real** — rodar `make dev`, abrir `/library`, conferir pelo menos uma carta do
piloto de cada tipo (monstro, mágica, armadilha) contra o exemplo de referência do PDF do usuário.

## Fase 4: Integração no Build Deck

**10. Carregador e componentes** — resolver `cropArt` no carregador da coleção do Build Deck; usar
`CardFrame`/fallback em `CollectionCardItem` e `CollectionCardGridItem`.

## Fase 5: Integração no Free Duel e no Password

**11. Free Duel** — resolver `cropArt` para as cartas de duelo; `DuelZone` e a mão usam a variante
compacta, `DuelCardPreview` e `CardDropReward` usam a variante completa.

**12. Password** — resolver `cropArt` no carregador do Password; `CardPreview` usa `CardFrame`/fallback.

**13. Verificação visual final** — rodar `make dev` de novo, conferir Build Deck, uma tela de duelo (mão +
tabuleiro) e Password com pelo menos uma carta do piloto cada.
