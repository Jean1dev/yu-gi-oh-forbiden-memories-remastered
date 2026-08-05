# Componente CardFrame — Mágica/Armadilha

> PRD: `docs/prds/renderizacao-cartas.md` — F05
> Pacote-alvo: `apps/web`

## 1. Contexto e Escopo

Componente React irmão de `renderizacao-cartas/F04`, mesma estrutura de layout (nome+ícone no topo, janela
de arte, faixa inferior de texto), mas para `tipo` em `magica`/`equipamento`/`ritual` (paleta verde) e
`armadilha` (paleta rosa/magenta) — sem estrelas nem ATK/DEF, que não se aplicam a essas cartas.

### Incluído
- Variante completa: nome, ícone de tipo (mágica ou armadilha), janela de arte, descrição
- Variante compacta: arte + nome, sem descrição
- Mesmos 3 estados de imagem (arte/placeholder/silhueta) que F04

### Fronteiras
- `tipo = monstro` é `renderizacao-cartas/F04`
- Decidir *se* uma carta usa este componente ou o fallback é `renderizacao-cartas/F06`

### Decisões e Premissas

| # | Decisão / Premissa | Origem | Status |
|---|--------------------|--------|--------|
| 1 | Paleta por `tipo`: `magica`/`equipamento`/`ritual` → verde; `armadilha` → rosa/magenta — mapeamento fixo no componente, não um campo novo no schema | PRD F05 Capabilities + decisão já confirmada na entrevista do PRD | confirmada |
| 2 | Ícone de tipo: badge retangular com o rótulo `MAGIA` (verde) ou `ARMADILHA` (rosa), mesmo padrão visual do `AttributeBadge` de F04, mas domínio diferente (`tipo`, não `Attribute`) — componente próprio (`SpellTrapBadge`), não uma reutilização forçada de `AttributeBadge` | Adaptação técnica — `AttributeBadge` é tipado sobre o enum `Attribute`, que cartas de mágica/armadilha não têm | confirmada |
| 3 | Cores: verde `#2c5c3a`/texto sand, rosa `#7a1f4a`/texto sand — mesma lógica de derivação da paleta existente que F04, Decisão 2 | Adaptação técnica desta spec | confirmada |

## 2. Alocação no Monorepo

| Arquivo | Pacote | Novo/Alterado | Responsabilidade |
|---------|--------|---------------|------------------|
| `apps/web/src/components/card-frame/spell-trap-badge.tsx` | web | novo | badge de tipo (mágica/armadilha) |
| `apps/web/src/components/card-frame/spell-trap-badge.module.css` | web | novo | cores verde/rosa |
| `apps/web/src/components/card-frame/spell-trap-badge.test.tsx` | web | novo | testes de renderização |
| `apps/web/src/components/card-frame/spell-trap-card-frame.tsx` | web | novo | `SpellTrapCardFrame`, variantes completa/compacta |
| `apps/web/src/components/card-frame/spell-trap-card-frame.module.css` | web | novo | layout verde/rosa |
| `apps/web/src/components/card-frame/spell-trap-card-frame.test.tsx` | web | novo | testes de renderização |

**Verificação da direção de dependências:** igual a F04 — sem novos pacotes, sem I/O.

## 3. Design Técnico

### Fluxo (Experience)
1. Recebe `card: Card` (com `tipo != "monstro"` e `descricao` preenchida) e `art: ArtReference`
2. Variante completa: cabeçalho (`nome` + `SpellTrapBadge`), janela de arte (mesmo `CardArt` interno de
   F04), rodapé só com `card.descricao` (sem ATK/DEF nem estrelas)
3. Variante compacta: arte + `nome`, sem rodapé
4. `SpellTrapBadge` deriva a cor/rótulo de `card.tipo`: `armadilha` → rosa/"ARMADILHA"; qualquer outro
   valor (`magica`/`equipamento`/`ritual`) → verde/"MAGIA" (Decisão 1)

### Regras de negócio
- Nunca renderiza estrelas nem ATK/DEF, mesmo que presentes no objeto `Card` — o componente ignora esses
  campos por construção, não por checá-los como ausentes

## 6. Tratamento de Erros e Casos de Borda

| Cenário | Detecção | Comportamento |
|---------|----------|----------------|
| `art.kind === "placeholder"` ou `"silhouette"` | Prop `art` | Mesmo bloco neutro de F04 |
| Falha de carregamento da imagem | `onError` | Mesmo fallback de F04 |
| `card.descricao` null (carta ainda não enriquecida, chamada incorreta) | Prop `card` | Rodapé vazio, não quebra |

## 7. Estratégia de Testes

### Unitários (Vitest + Testing Library, `@vitest-environment jsdom`)

`spell-trap-badge.test.tsx`:
- `renderiza rótulo e cor de armadilha quando tipo é armadilha`
- `renderiza rótulo e cor de magia quando tipo é magica, equipamento ou ritual`

`spell-trap-card-frame.test.tsx`:
- `variante completa renderiza nome, badge de tipo, arte e descrição`
- `variante compacta renderiza só arte e nome`
- `nunca renderiza estrelas nem ATK/DEF`
- `cai no placeholder quando art.kind é placeholder`

### Testes de aceitação (critérios do PRD)

| Critério (Seção 9 do PRD) | Teste |
|---------------------------|-------|
| Uma carta de mágica/equipamento/ritual do piloto renderiza com paleta verde e sem estrelas/ATK/DEF | `renderiza rótulo e cor de magia...` + `nunca renderiza estrelas...` |
| Uma carta de armadilha do piloto renderiza com paleta rosa/magenta | `renderiza rótulo e cor de armadilha...` |
| A variante compacta mostra só arte e nome | `variante compacta renderiza...` |
