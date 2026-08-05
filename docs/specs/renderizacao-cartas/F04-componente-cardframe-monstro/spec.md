# Componente CardFrame — Monstro

> PRD: `docs/prds/renderizacao-cartas.md` — F04
> Pacote-alvo: `apps/web`

## 1. Contexto e Escopo

Componente React que desenha uma carta de monstro em tempo real a partir dos dados do `Card` — nome,
ícone de atributo, estrelas de nível, ilustração (arte crop), ATK/DEF e descrição — reproduzindo o layout
do exemplo de referência do PDF do usuário (`Curse of Dragon`: nome+ícone no topo, estrelas, janela de
arte, faixa inferior com raça/descrição à esquerda e ATK/DEF à direita). Usa exclusivamente os tokens de
design já definidos em `globals.css` (paleta PS1-CRT dourada, bevels, tipografia pixelada) — nenhuma cor ou
fonte nova é introduzida.

### Incluído
- Variante completa: nome, ícone de atributo, estrelas de nível (1 por nível, até 12), janela de arte,
  raça (`classe`) + descrição, ATK/DEF
- Variante compacta: arte + nome + ATK/DEF, sem estrelas nem descrição (mesma informação que `DuelZone` já
  mostra hoje via `<img>` cru)
- Estados de imagem ausente/erro (placeholder e silhueta), no mesmo espírito de `CardArt`/`DuelCardArt` já
  existentes — este componente não decide *se* há arte crop disponível (isso é F06); ele recebe a arte já
  resolvida e sabe desenhar os 3 estados
- Ícones de atributo: badge simplificado (retângulo com sigla de 2 letras), original deste projeto —
  nenhuma arte licenciada de terceiros

### Fronteiras
- Decidir *se* uma carta usa `CardFrame` ou a imagem completa antiga (fallback) é `renderizacao-cartas/F06`
- A paleta verde/rosa de mágica-armadilha é `renderizacao-cartas/F05` — este componente só cobre `tipo = monstro`

### Decisões e Premissas

| # | Decisão / Premissa | Origem | Status |
|---|--------------------|--------|--------|
| 1 | Ícone de atributo: badge retangular (24px compacto / 32px completo) com sigla de 2 letras (`LI`, `DA`, `EA`, `WA`, `FI`, `WI`, `DI`), cor de fundo própria por atributo, texto em `--font-display` | PRD F04 Capabilities ("representação simplificada própria do projeto", Seção 7 Fora de Escopo confirma que não é arte licenciada) | confirmada |
| 2 | Cores por atributo (tokens novos, só usados aqui): DARK `#3d2a5c`/texto dourado, LIGHT `#f4e8c1`/texto preto, EARTH `#8a5a2c`/texto areia, WATER `#2a5c8a`/texto branco, FIRE `#8a2c2c`/texto branco, WIND `#2c8a5c`/texto branco, DIVINE gradiente dourado-branco/texto preto — derivadas da paleta existente (`--color-gold`, `--color-night*`), nunca uma paleta nova desconectada | Adaptação técnica desta spec — o PRD não fixa cores exatas, só pede "representação simplificada" | confirmada |
| 3 | Estrelas de nível reaproveitam o glifo ★ (texto), não um SVG — mesmo princípio de "sem asset novo" dos ícones de atributo | Adaptação técnica desta spec | confirmada |
| 4 | Componente é apresentacional puro: recebe `art` já resolvida (mesmo formato `ArtReference` de `library/schema.ts` — `art` | `placeholder` | `silhouette`) em vez de receber `numero` e resolver sozinho — mantém a mesma responsabilidade que `CardArt` já tem hoje | Padrão já estabelecido por `CardArt` (`apps/web/src/components/library/card-art.tsx`) | confirmada |

## 2. Alocação no Monorepo

| Arquivo | Pacote | Novo/Alterado | Responsabilidade |
|---------|--------|---------------|------------------|
| `apps/web/src/components/card-frame/attribute-badge.tsx` | web | novo | badge de atributo, compartilhado por F04 e F05 |
| `apps/web/src/components/card-frame/attribute-badge.module.css` | web | novo | cores por atributo (Decisão 2) |
| `apps/web/src/components/card-frame/attribute-badge.test.tsx` | web | novo | testes de renderização |
| `apps/web/src/components/card-frame/monster-card-frame.tsx` | web | novo | `MonsterCardFrame`, variantes completa/compacta |
| `apps/web/src/components/card-frame/monster-card-frame.module.css` | web | novo | layout dourado (Decisão 1 do PRD F04) |
| `apps/web/src/components/card-frame/monster-card-frame.test.tsx` | web | novo | testes de renderização |

**Verificação da direção de dependências:** `apps/web` já depende de `@yugioh/shared` (para o tipo `Card`);
nenhum import novo de outro pacote. Componente client-side padrão (`"use client"`, mesmo módulo de
`CardArt`), sem `node:fs` nem acesso a `lib/server/`.

## 3. Design Técnico

### Fluxo (Experience)
1. Recebe `card: Card` (com `atributo`/`nivel`/`descricao` preenchidos — contrato assume que o chamador só
   usa este componente para cartas já enriquecidas, decisão de F06) e `art: ArtReference`
2. Variante completa: cabeçalho (`nome` + `AttributeBadge`), estrelas (`card.nivel` glifos `★`), janela de
   arte (`CardArt` reaproveitado internamente para os 3 estados de imagem), rodapé com `card.classe` +
   `card.descricao` à esquerda, `ATK {atk} / DEF {def}` à direita
3. Variante compacta: janela de arte + `nome` + `ATK {atk} / DEF {def}`, sem cabeçalho de atributo nem
   rodapé de descrição
4. `atk`/`def` nulos (não deveria ocorrer para monstro, mas o componente não assume — usa `?? "—"` como
   qualquer valor ausente do domínio)

### Responsividade e performance
Segue `docs/arquitetura.md` §7: layout fluido 320–1920px (a carta é um cartão de proporção fixa `3:4` para
a janela de arte, igual ao `ART_STYLE` já usado em `CardArt`), sem media query própria — quem posiciona o
`CardFrame` na grade (Library, Build Deck) já resolve o tamanho do slot.

### Regras de negócio
- Estrelas: `Math.max(0, card.nivel ?? 0)` glifos, nunca mais que 12 (limite já garantido pelo `CardSchema`)
- Badge de atributo omitido (não o glifo `?`) quando `card.atributo` é `null` — carta sem atributo mapeado
  não inventa um valor

## 6. Tratamento de Erros e Casos de Borda

| Cenário | Detecção | Comportamento |
|---------|----------|----------------|
| `art.kind === "placeholder"` ou `"silhouette"` | Prop `art` | Mesmo bloco visual neutro que `CardArt` já renderiza hoje, reaproveitado |
| Falha de carregamento da imagem (`onError`) | `<img onError>` | Cai para o mesmo placeholder, reaproveitando a lógica de `CardArt` |
| `card.atributo` null | Prop `card` | `AttributeBadge` não renderiza (retorna `null`) |
| `card.nivel` null (carta ainda não enriquecida, chamada incorreta) | Prop `card` | 0 estrelas, não quebra |

## 7. Estratégia de Testes

### Unitários (Vitest + Testing Library, `@vitest-environment jsdom`)

`attribute-badge.test.tsx`:
- `renderiza a sigla correta para cada um dos 7 atributos`
- `não renderiza nada quando atributo é null`

`monster-card-frame.test.tsx`:
- `variante completa renderiza nome, badge de atributo, estrelas, raça, descrição e ATK/DEF`
- `variante compacta renderiza só arte, nome e ATK/DEF`
- `renderiza o número de estrelas igual ao nivel da carta`
- `cai no placeholder quando art.kind é placeholder`
- `cai no placeholder quando a imagem falha ao carregar (onError)`

### Testes de aceitação (critérios do PRD)

| Critério (Seção 9 do PRD) | Teste |
|---------------------------|-------|
| Uma carta de monstro do piloto renderiza nome, ícone de atributo, estrelas de nível corretas, arte, ATK/DEF e descrição na variante completa | `variante completa renderiza...` |
| A variante compacta da mesma carta mostra só arte, nome e ATK/DEF | `variante compacta renderiza...` |
| Carta de monstro sem dado de enriquecimento não usa CardFrame (cai no fallback de F06) | Fora do escopo desta feature — é regra de F06, testada lá |
