# Equipamentos de Buff

> Cartas: os 34 `equipamento` do dataset
> Efeito: `equip_buff` — ver [`README.md`](./README.md) §3

Trinta e quatro equipamentos que somam ATK e DEF a **um** monstro escolhido.

## 1. Os valores

**Todo equipamento do jogo original dá +500 ATK e +500 DEF.** A única exceção é **657 Megamorph**,
que dá **+1000/+1000** — e é o texto dele, *"increases the power of any selected monster by 2
levels"*, que fixa `POWER_PER_LEVEL = 500` para o resto do sistema
([`README.md`](./README.md) §3).

Não há coluna de bônus no datamine porque o valor é constante no motor do jogo. É por isso que a
tabela de efeitos reusa uma única constante `EQUIP_BUFF` em 33 das 34 entradas: não existe
variação para modelar.

## 2. Decisão — a compatibilidade é extraída, não derivada

Quais monstros um equipamento aceita **não sai de `classe` nem de atributo**. Verificado
empiricamente contra os 621 monstros, das 34 listas só três coincidem com algum filtro:

- 657 Megamorph e 668 Bright Castle aceitam os 621 monstros;
- 659 Winged Trumpeter aceita exatamente `Fairy`.

As outras 31 são curadas à mão pelo jogo original, e cruzam classes livremente:

- **062 Harpie Lady é `Winged Beast`** e aceita 323 Book of Secret Arts, que o texto descreve como
  "a magic book for increasing the power of magic-users".
- **582 Dark Witch é `Fairy`** e aceita tanto 312 Silver Bow and Arrow quanto Book of Secret Arts.
- **309 Steel Shell** ("boosts the power of shelled monsters") alcança 16 monstros espalhados por
  Aqua, Fish, Reptile e Rock.
- Três equipamentos têm **um único** hospedeiro: 318 Elegant Egotist (Harpie Lady), 652 Magical
  Labyrinth (Labyrinth Wall) e 658 Metalmorph (Zoa).

Por isso `equip_buff` não carrega `requires`. Os 4041 pares vivem em
`packages/shared/src/duel/spell-effects/equip-compatibility.ts`, **gerado** por
`packages/data/scripts/extract-fm-equip-compatibility.ts` a partir da tabela `equipinfo`. Editar o
arquivo à mão é errado; rode o script.

O módulo mora em `shared`, e não em `packages/data`, pelo mesmo motivo do ADR-S2: `sumEquipBonuses`
roda em `packages/engine`, que só pode importar `@yugioh/shared`, e `apply(state, action)` é uma
função de dois parâmetros sem por onde injetar um provedor. Os números são guardados juntados por
vírgula (16 KB contra 24 KB em arrays, e `shared` não tem build, então esse módulo chega ao
navegador) e expandidos uma vez na carga do módulo para `Set`.

## 3. Comportamento

**Ação:** `equip_card { handIndex, targetZone }`. O jogador ativo escolhe **um monstro seu** já em
campo. Consome a jogada da mão do turno.

**Anexação:** a carta é removida da mão e empilhada em `MonsterZone.equips` como um anexo de
polaridade `normal` (ou `reversed` quando 689 Reverse Trap dispara). Ela
**não ocupa zona de magia** — equipamentos vivem no monstro, não na fileira de trás.

**Bônus derivado, nunca armazenado.** O `equips` guarda carta + polaridade; o delta é recalculado a cada
`resolveAttack` a partir da entrada da tabela e da lista de compatibilidade. O `atk`/`def` base da
carta nunca é sobrescrito (`docs/arquitetura.md` §3.1).

**Hospedeiro incompatível = bônus 0.** Equipar Legendary Sword em 001 Blue-eyes White Dragon é uma
jogada **legal**: a carta anexa, gasta a jogada do turno e contribui nada. Não é erro e o
equipamento não é removido. O jogo original recusa a jogada; aqui ela passa com bônus zero porque
modelar como recusa exigiria que a UI conhecesse a lista antes de deixar o jogador escolher — uma
decisão consciente, registrada aqui para não ser "consertada" por engano.

**Acúmulo:** vários equipamentos no mesmo monstro somam com sua polaridade. O resultado efetivo
tem piso zero desde `traps/F01`; não há teto —
`calculateEffectiveAtkDef` não faz clamp (`motor-duelo-1x1/F04` spec Decisão 7).

**Destruição:** quando o hospedeiro sai do campo (combate, 336, 337, 329, 653…), a zona vira
`{ occupied: false }` e os equipamentos somem junto. Zero código de limpeza, e não há como vazar
um equipamento órfão — foi por isso que `equips` mora na zona do monstro e não numa zona de magia.
`curseLevels` some pelo mesmo caminho ([`stat-curse.md`](./stat-curse.md) §3).

## 4. Como o bônus chega ao combate

`resolveAttack` constrói um `ModifierProviders` real por zona, em vez de usar
`neutralCombatProviders`:

```
zoneCombatProviders(zone) = { ...neutralCombatProviders,
                              equipment: (m) => sumEquipBonuses(m, zone.equips)
                                              + cursePenalty(zone.curseLevels) }
```

Só o slot `equipment` fica vivo; `guardian` e `terrain` continuam neutros até seus próprios
motores existirem. A maldição entra nesse mesmo slot em vez de num quarto provedor porque o slot
já significa "o delta derivado desta zona" — assim `ModifierProviders` e
`calculateEffectiveAtkDef` não mudam nada. E `calculateEffectiveAtkDef` já soma termo a termo sem
clamp, que é o que deixa um monstro amaldiçoado ficar com ATK efetivo negativo sem caso especial.

Isso é exatamente a extensão que o comentário de `neutral-combat-providers.ts` antecipava: o
provedor real fecha sobre o contexto extra no momento da construção, e não por um terceiro
parâmetro em `apply`.

## 5. Recusas

| Cenário | Código |
| --- | --- |
| A carta não é um `equip_buff` | `invalid_equip_card_type` |
| A zona alvo não é de monstro | `equip_target_not_monster_zone` |
| A zona alvo é do oponente | `equip_target_not_owned` |
| A zona alvo está vazia | `equip_target_zone_empty` |
| Um `equip_buff` foi jogado por `play_spell_or_trap` | `equip_requires_target` |
| A jogada da mão do turno já foi usada | `hand_play_already_used` |
| Não há carta no `handIndex` | `card_unavailable` |
| Fora da fase principal | `wrong_phase` |
