# Equipamentos de Buff

> Cartas: 301, 303, 304, 305, 307, 308, 311, 314, 315, 657
> Efeito: `equip_buff` — ver [`README.md`](./README.md) §3

Dez equipamentos que somam ATK e/ou DEF a **um** monstro escolhido.

## 1. As cartas

| Nº | Nome | ATK | DEF | Restrição de classe |
| --- | --- | --- | --- | --- |
| 301 | Legendary Sword | +500 | +500 | `Warrior` |
| 303 | Dark Energy | +500 | +500 | `Fiend` |
| 304 | Axe of Despair | +1000 | +1000 | qualquer |
| 305 | Laser Cannon Armor | +0 | +500 | qualquer |
| 307 | Elf's Light | +500 | +500 | `Spellcaster` |
| 308 | Beast Fangs | +500 | +500 | `Beast` |
| 311 | Black Pendant | +500 | +500 | qualquer |
| 314 | Horn of the Unicorn | +700 | +700 | qualquer |
| 315 | Dragon Treasure | +500 | +500 | `Dragon` |
| 657 | Megamorph | +1000 | +0 | qualquer |

Todas as cinco classes restritas têm alvos reais no dataset: `Warrior` (74 cartas), `Fiend` (69),
`Spellcaster` (57), `Beast` (41), `Dragon` (32).

## 2. Decisão — "tipo Dark" e "tipo Luz" não existem no dataset

O schema de `Card` não tem campo de atributo. `classe` é o único eixo de tipo, e nem `Dark` nem
`Light` estão entre seus 24 valores. As descrições de 303 e 307 foram mapeadas para a classe que
cada carta realmente afeta no Forbidden Memories:

- **303 Dark Energy → `classe: "Fiend"`**
- **307 Elf's Light → `classe: "Spellcaster"`**

Se um conceito de atributo entrar no dataset algum dia, estas duas entradas da tabela são o único
lugar a mudar.

## 3. Comportamento

**Ação:** `equip_card { handIndex, targetZone }`. O jogador ativo escolhe **um monstro seu** já em
campo. Consome a jogada da mão do turno.

**Anexação:** a carta é removida da mão e empilhada em `MonsterZone.equips` do hospedeiro. Ela
**não ocupa zona de magia** — equipamentos vivem no monstro, não na fileira de trás.

**Bônus derivado, nunca armazenado.** O `equips` guarda as cartas; o delta é recalculado a cada
`resolveAttack` a partir da entrada da tabela e da `classe` do hospedeiro. Consequência
verificável: equipar Dragon Treasure num Warrior contribui 0 hoje, e passaria a contribuir 500 se
a classe do hospedeiro mudasse. O `atk`/`def` base da carta nunca é sobrescrito
(`docs/arquitetura.md` §3.1).

**Restrição não atendida = bônus 0.** Equipar Legendary Sword num Dragon é uma jogada **legal**:
a carta anexa, gasta a jogada do turno e contribui nada. Não é erro e o equipamento não é
removido. Modelar como recusa exigiria que a UI conhecesse a restrição antes de deixar o jogador
escolher, e o FM também permite o desperdício.

**Acúmulo:** vários equipamentos no mesmo monstro somam, sem teto. `Math.max` nenhum —
`calculateEffectiveAtkDef` não faz clamp (`motor-duelo-1x1/F04` spec Decisão 7).

**Destruição:** quando o hospedeiro sai do campo (combate, 336, 337, 329, 302), a zona vira
`{ occupied: false }` e os equipamentos somem junto. Zero código de limpeza, e não há como vazar
um equipamento órfão — foi por isso que `equips` mora na zona do monstro e não numa zona de magia.

## 4. Como o bônus chega ao combate

`resolveAttack` constrói um `ModifierProviders` real por zona, em vez de usar
`neutralCombatProviders`:

```
equipCombatProviders(zone) = { ...neutralCombatProviders,
                               equipment: (m) => sumEquipBonuses(m, zone.equips) }
```

Só o slot `equipment` fica vivo; `guardian` e `terrain` continuam neutros até seus próprios
motores existirem. `calculateEffectiveAtkDef` não muda — já soma termo a termo, sem clamp, e é por
isso que 305 (`+0/+500`) e 657 (`+1000/+0`) funcionam sem caso especial.

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
