# Integração nas Telas Existentes

> PRD: `docs/prds/renderizacao-cartas.md` — F06
> Pacote-alvo: `packages/data` + `packages/shared` + `apps/web`

## 1. Contexto e Escopo

Liga o que F01-F05 construíram às telas reais: troca a imagem estática (`CardArt`/`DuelCardArt`/`<img>` cru)
pelo `CardFrame` novo nos 5 pontos onde uma carta aparece hoje — Library, Build Deck, Free Duel (mão,
tabuleiro, tela de vitória) e Password — com fallback automático para a imagem completa antiga em qualquer
carta ainda não migrada (as ~707 fora do piloto).

O catálogo (`packages/data/src/catalog`) hoje só expõe o manifesto de arte completa
(`getArtManifest()`); esta feature estende o mesmo padrão para o manifesto de arte crop
(`crop-arts-manifest.json`, gerado por F03), e adiciona uma rota que sirva `cards-data/art/NNN.jpg` (a
rota atual só serve `cards-data/NNN.jpg`, na raiz).

### Incluído
- `CardCatalog.getCropArtManifest()`, espelhando `getArtManifest()` já existente
- Rota `GET /cards-data/art/[file]` servindo `cards-data/art/NNN.jpg`
- `CardFrame`: dispatcher que escolhe `MonsterCardFrame`/`SpellTrapCardFrame` por `card.tipo`
- `shouldUseCardFrame(card, cropArt)`: decide CardFrame vs. imagem completa antiga
- `LibraryEntry` (`packages/shared`) ganha um campo opcional `cropArt?: ObtainedArtReference`, computado do
  mesmo jeito que `art` hoje, só que a partir do manifesto crop
- Integração em: `CardCell`/`CardDetail` (Library), `CollectionCardItem`/`CollectionCardGridItem` (Build
  Deck), `DuelZone`/`DuelCardPreview`/`CardDropReward` (Free Duel), `CardPreview` (Password)
- Variante compacta nas zonas de tabuleiro e na mão; variante completa em todo o resto

### Fronteiras
- Migrar as ~707 cartas restantes é `renderizacao-cartas/F07` — esta feature só integra o mecanismo, não
  roda o enriquecimento em mais cartas
- Aposentar `cards-data/NNN.jpg` é decisão de F07 (só depois da cobertura chegar a 100%) — esta feature
  mantém as duas fontes de imagem convivendo

### Decisões e Premissas

| # | Decisão / Premissa | Origem | Status |
|---|--------------------|--------|--------|
| 1 | `CardFrame` é usado quando `cropArt.kind === "art"` **e** `card.descricao !== null` (sinal de que a carta foi enriquecida — os 3 campos de F01 são sempre preenchidos juntos); caso contrário, cai no `<img>`/`CardArt` legado com o `art` de sempre | PRD F06 Capabilities ("regra de fallback") | confirmada |
| 2 | `LibraryEntry.cropArt` é opcional (`?:`) em vez de sempre presente, para não obrigar todo consumidor existente de `LibraryEntry` a saber sobre ele — mesmo raciocínio de compatibilidade de F01, Decision 6 | Adaptação técnica — `LibraryEntry` é um tipo `@yugioh/shared` consumido por testes fora deste PRD | confirmada |
| 3 | Build Deck, Free Duel e Password não compartilham o carregador de catálogo da Library (`catalog-library.ts`) — cada um tem o próprio (`catalog-password.ts` e equivalentes) — então a resolução de `cropArt` é replicada em cada carregador, do mesmo jeito que a resolução de `art` completa já é hoje (nenhum carregador novo compartilhado é criado; seria uma refatoração fora do escopo desta feature) | Padrão já observado no código: cada módulo resolve arte à sua maneira | confirmada |
| 4 | Zonas de tabuleiro (`DuelZone`) e mão usam `CardFrame` variante `compacto`; `DuelCardPreview` (painel de detalhe ao lado) usa variante `completo` — o preview já tem espaço de sobra, igual à Library | Decisão já confirmada na entrevista do PRD (pergunta "Tamanho no duelo") | confirmada |

## 2. Alocação no Monorepo

| Arquivo | Pacote | Novo/Alterado | Responsabilidade |
|---------|--------|---------------|------------------|
| `packages/data/src/catalog/types.ts` | data | alterado | `CardCatalog` ganha `getCropArtManifest()` |
| `packages/data/src/catalog/create-catalog.ts` | data | alterado | `CatalogInput` ganha `cropArtManifest` (default `{}`) |
| `packages/data/src/catalog/create-catalog.test.ts` | data | alterado | casos novos para `getCropArtManifest` |
| `packages/data/scripts/load-catalog-from-disk.ts` | data | alterado | lê `crop-arts-manifest.json` (ausente = `{}`, nunca erro) |
| `packages/shared/src/library/types.ts` | shared | alterado | `LibraryEntry` (variante `obtained: true`) ganha `cropArt?: ObtainedArtReference` |
| `packages/shared/src/library/schema.ts` | shared | alterado | espelha o campo opcional no schema |
| `apps/web/src/app/cards-data/art/[file]/route.ts` | web | novo | serve `cards-data/art/NNN.jpg` |
| `apps/web/src/components/card-frame/card-frame.tsx` | web | novo | dispatcher `CardFrame` |
| `apps/web/src/components/card-frame/card-frame.test.tsx` | web | novo | testes do dispatcher |
| `apps/web/src/lib/card-frame/should-use-card-frame.ts` | web | novo | `shouldUseCardFrame(card, cropArt)` |
| `apps/web/src/lib/card-frame/should-use-card-frame.test.ts` | web | novo | testes da regra de fallback |
| `apps/web/src/lib/library/catalog-library.ts` | web | alterado | resolve `cropArt` a partir de `getCropArtManifest()` |
| `apps/web/src/components/library/card-cell.tsx` | web | alterado | usa `CardFrame`/fallback |
| `apps/web/src/components/library/card-detail.tsx` | web | alterado | usa `CardFrame`/fallback (variante completa) |
| `apps/web/src/lib/build-deck/**` (carregador da coleção) | web | alterado | resolve `cropArt` do mesmo jeito |
| `apps/web/src/components/build-deck/collection-card-item.tsx` | web | alterado | usa `CardFrame`/fallback |
| `apps/web/src/components/build-deck/collection-card-grid-item.tsx` | web | alterado | usa `CardFrame`/fallback |
| `apps/web/src/lib/free-duel/**` (dados de duelo) | web | alterado | resolve `cropArt` para as cartas do duelo |
| `apps/web/src/components/free-duel/duel-zone.tsx` | web | alterado | usa `CardFrame` variante compacta |
| `apps/web/src/components/free-duel/duel-card-preview.tsx` | web | alterado | usa `CardFrame` variante completa |
| `apps/web/src/components/free-duel/card-drop-reward.tsx` | web | alterado | usa `CardFrame`/fallback |
| `apps/web/src/lib/password/catalog-password.ts` | web | alterado | resolve `cropArt` |
| `apps/web/src/components/password/card-preview.tsx` | web | alterado | usa `CardFrame`/fallback |

**Verificação da direção de dependências:** `packages/data` e `packages/shared` seguem puros (sem I/O novo
em `src/`; a leitura do arquivo fica em `scripts/load-catalog-from-disk.ts`, já um adapter de I/O).
`apps/web` depende de ambos, como já depende hoje — nenhuma inversão.

## 3. Design Técnico

### Fluxo (Experience)
1. Cada carregador de catálogo (`catalog-library.ts` e equivalentes) passa a também consultar
   `catalog.getCropArtManifest()` por `numero`, produzindo um `ObtainedArtReference` igual ao que já produz
   para `art`, mas apontando para `/cards-data/art/{numero}.jpg`
2. O componente de exibição (`CardCell`, etc.) chama `shouldUseCardFrame(card, cropArt)`: verdadeiro só
   quando `cropArt.kind === "art"` e `card.descricao !== null` (Decisão 1)
3. Verdadeiro → renderiza `<CardFrame card={card} art={cropArt} size={...} />` (que internamente escolhe
   `MonsterCardFrame` ou `SpellTrapCardFrame` por `card.tipo`)
4. Falso → mantém exatamente o `<img>`/`CardArt` de hoje com o `art` de sempre — nenhuma tela nova, nenhum
   componente novo nesse caminho

### Regras de negócio
- A regra de fallback (Decisão 1) vive só em `shouldUseCardFrame`, chamada da mesma forma nos 5 pontos de
  integração — nenhuma tela reimplementa a checagem

## 6. Tratamento de Erros e Casos de Borda

| Cenário | Detecção | Comportamento |
|---------|----------|----------------|
| Carta com `cropArt` mas sem enriquecimento (estado impossível pela mescla de F01, mas o código não confia) | `shouldUseCardFrame` checa os dois | Cai no fallback |
| Arte crop existe no manifesto mas o arquivo sumiu do disco depois do build | `onError` do `<img>` dentro de `CardArt` (reaproveitado por `CardFrame`) | Mesmo placeholder neutro que já existe hoje — **não** faz fallback dinâmico para a imagem completa (fallback é decidido em build/load time, não em runtime de erro de rede) |
| Rota `/cards-data/art/[file]` recebe um nome fora do padrão `NNN.jpg` | Regex na rota, igual à rota existente | 404 |

## 7. Estratégia de Testes

### Unitários (Vitest)

`should-use-card-frame.test.ts`:
- `true quando cropArt é art e a carta tem descricao`
- `false quando cropArt não é art`
- `false quando a carta não tem descricao, mesmo com cropArt disponível`

`card-frame.test.tsx` (`@vitest-environment jsdom`):
- `renderiza MonsterCardFrame quando tipo é monstro`
- `renderiza SpellTrapCardFrame quando tipo não é monstro`

`create-catalog.test.ts` (casos novos):
- `getCropArtManifest retorna o manifesto informado`
- `getCropArtManifest retorna {} quando cropArtManifest não é informado`

### Integração
- `apps/web/tests/library-search.integration.test.tsx` e os testes de componente já existentes de
  `CardCell`/`CardDetail`/`CollectionCardItem`/`DuelZone`/`CardPreview` ganham um caso cada: carta com
  `cropArt` presente renderiza `CardFrame`; carta sem `cropArt` continua renderizando a imagem antiga
  (teste de regressão de fallback, Objetivo de Sucesso 4 do PRD)

### Testes de aceitação (critérios do PRD)

| Critério (Seção 9 do PRD) | Teste |
|---------------------------|-------|
| Library, Build Deck, Free Duel e Password mostram CardFrame para as cartas do piloto e a imagem completa antiga para as demais | Casos de integração por tela |
| Zonas de tabuleiro e mão em Free Duel usam a variante compacta | Caso de integração de `DuelZone` |
| Falha de carregamento da arte crop cai no mesmo placeholder que CardArt/DuelCardArt já usam hoje | Reaproveitamento direto de `CardArt`, sem lógica nova |
| Nenhuma carta fora do piloto perde sua exibição atual (teste de regressão de fallback) | Caso "carta sem cropArt continua renderizando a imagem antiga" em cada tela |

### Testes de integração cross-feature e cross-PRD
| Critério | Teste |
|----------|-------|
| Card enriquecido e com arte crop em banco-de-cartas aparece corretamente como CardFrame em Library, Build Deck, Free Duel e Password | Suíte de integração de cada tela, cartas reais do piloto |
