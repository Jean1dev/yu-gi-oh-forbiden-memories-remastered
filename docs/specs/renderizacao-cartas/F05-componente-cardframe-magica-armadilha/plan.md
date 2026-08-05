# Plano de Implementação — Componente CardFrame (Mágica/Armadilha)

> Spec: `./spec.md`

## Pré-requisitos
- `renderizacao-cartas/F01` implementada — confirmado
- Não depende de F04 (mesma wave, execução independente), mas reaproveita o mesmo padrão visual

## Fase 1: Badge de tipo

**1. Componente e estilos** — criar `SpellTrapBadge` em `apps/web/src/components/card-frame/`.

**2. Testes** — cobrir os casos da Seção 7 da spec.

## Fase 2: CardFrame de mágica/armadilha

**3. Componente e estilos** — criar `SpellTrapCardFrame`, variantes completa e compacta.

**4. Testes** — cobrir os casos da Seção 7 da spec.

## Fase 3: Verificação visual

**5. Conferir no navegador** — smoke test com uma carta de mágica e uma de armadilha do piloto, nas duas
variantes.
