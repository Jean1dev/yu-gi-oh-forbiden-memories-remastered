# Duelistas

Um documento por personagem NPC. Cada um explica **de onde vieram os dados**, **qual é o deck**,
**o que ele dropa** e **como ele joga** — o suficiente para revisar o duelista sem abrir o JSON e
para calibrar o perfil de IA sem adivinhar.

Adicionar um duelista é **edição de dados, nunca de código** (PRD `free-duel` F01). O caminho
completo está no skill [`duelist-builder`](../../.agents/skills/duelist-builder/SKILL.md).

## Cadeia de arquivos

```
sg4e/YGOFM-gamedata (fm-sqlite3.db)
        │  data:extract-fm-duelist --id=<id> --name="<Nome no FM>"
        ▼
packages/data/data/duelists/<id>.json     ← fonte por personagem (pools ponderados + escolhas de balanceamento)
        │  data:build-roster
        ▼
packages/data/data/roster.json            ← gerado; nunca editado à mão
        │  roster:validate
        ▼
seleção de oponente do Free Duel
```

## Por que o deck é derivado, e não copiado

O jogo original **não dá um deck fixo ao NPC**. Ele sorteia 40 cartas de um pool ponderado no
início de cada duelo: sorteia `0..2047`, percorre as entradas **em ordem de número de carta**
subtraindo cada peso até o total ficar negativo, e aceita a carta se ainda houver menos de três
cópias dela — repetindo até 40. Nosso contrato de roster (`DuelistSchema.deck`) exige as 40 cartas
concretas, então rodamos **o mesmo algoritmo** uma vez, com uma seed registrada
(`deckSeed`), e gravamos o resultado. Mesma distribuição do original, com a vantagem de o deck ser
revisável num diff.

A seed é uma escolha de balanceamento: qualquer valor produz uma amostra legítima do pool, e cada
documento registra por que aquela foi escolhida.

## Campos de `data/duelists/<id>.json`

| Campo | Origem | O quê |
|---|---|---|
| `id` | autorado | Slug usado nas rotas e no `roster.json` |
| `name` | extraído | Nome exibido |
| `fmDuelistId` | extraído | Id do duelista no jogo original — a chave da extração |
| `handSize` | extraído | Mão no original. **Registrado por fidelidade; o motor distribui mão fixa** |
| `difficulty` | autorado | `easy` / `medium` / `hard`, exibido antes da escolha |
| `portrait` | autorado | Caminho de arte; ausente cai em placeholder neutro |
| `profile` | autorado | `{ strategy, parameters }` — semântica pertence a `packages/ai` |
| `deckSeed` | autorado | Seed da derivação |
| `deckPool` | extraído | Pool ponderado (peso em 2048) |
| `dropPools` | extraído | `common` ← BCD, `sa-pow` ← SAPow, `sa-tec` ← SATec |

`deckPool`/`dropPools` são sobrescritos a cada extração; todo o resto é preservado.

## Duelistas documentados

- [Teana](teana.md) — fácil, a primeira oponente do jogo
- [Jono](jono.md) — fácil, contraparte egípcia do Joey
