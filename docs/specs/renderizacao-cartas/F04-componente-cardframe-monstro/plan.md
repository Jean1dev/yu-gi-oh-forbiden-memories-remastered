# Plano de Implementação — Componente CardFrame (Monstro)

> Spec: `./spec.md`

## Pré-requisitos
- `renderizacao-cartas/F01` implementada (campos `atributo`/`nivel`/`descricao` disponíveis no `Card`) —
  confirmado

## Fase 1: Badge de atributo

**1. Componente e estilos** — criar `AttributeBadge` em `apps/web/src/components/card-frame/`, com as
cores e siglas dos 7 atributos.

**2. Testes** — cobrir os casos da Seção 7 da spec.

## Fase 2: CardFrame de monstro

**3. Componente e estilos** — criar `MonsterCardFrame`, variantes completa e compacta, reaproveitando
`CardArt` para os 3 estados de imagem e os tokens de `globals.css`.

**4. Testes** — cobrir os casos da Seção 7 da spec.

## Fase 3: Verificação visual

**5. Conferir no navegador** — montar uma tela de smoke test (ou usar Storybook-like ad-hoc via `make dev`)
com pelo menos uma carta do piloto, nas duas variantes, e comparar visualmente com o exemplo de referência
do PDF do usuário.
