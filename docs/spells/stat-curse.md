# Maldição de Poder

> Cartas: 349 Spellbinding Circle, 669 Shadow Spell, 655 Cursebreaker
> Efeitos: `stat_curse` e `cleanse_curses` — ver [`README.md`](./README.md) §3

Duas cartas que enfraquecem monstros do oponente, e uma que desfaz o estrago.

## 1. As cartas

| Nº | Nome | Efeito | Lado | Texto do jogo original |
| --- | --- | --- | --- | --- |
| 349 | Spellbinding Circle | `stat_curse`, 1 level | oponente | "A curse reduces the power of **all** enemy monsters!" |
| 669 | Shadow Spell | `stat_curse`, 2 levels | oponente | "Decreases an opponent's in-play monsters by two levels." |
| 655 | Cursebreaker | `cleanse_curses` | ambos | "Cancels the magic over all level-reduced monsters and sets them at level 0." |

**Não têm alvo.** As duas primeiras atingem *todos* os monstros do oponente — é uma das
divergências mais visíveis em relação ao TCG, onde Spellbinding Circle escolhe um monstro e trava
seus ataques. Aqui não há trava nenhuma: só perda de poder.

Cursebreaker não nomeia dono, então alcança os dois lados pela regra geral
([`README.md`](./README.md) §7). Ele **não** remove equipamentos: são outra carta, em outro
campo, e o texto fala só da maldição.

## 2. `levels`, e não ATK/DEF

O efeito guarda `levels`, e a conversão para pontos vive em uma constante:

```ts
const POWER_PER_LEVEL = 500;
```

O valor não foi escolhido — foi lido. 657 Megamorph é o único equipamento que dá +1000/+1000 em
vez de +500/+500, e o texto dele é *"increases the power of any selected monster by 2 levels"*.
Um level vale 500, e é isso que dá sentido literal aos três textos acima.

Guardar levels em vez de um delta de ATK/DEF é o que torna Cursebreaker uma atribuição só —
"sets them at level 0" vira `curseLevels: 0` — em vez de uma subtração que precisaria lembrar
quanto cada carta tinha tirado.

## 3. Novo campo de zona

```ts
// em MonsterZone (variante ocupada):
curseLevels?: number | undefined;
```

Opcional porque ausente significa "sem maldição", e porque assim toda fixture de `MonsterZone`
anterior a `spells/F02` continua compilando — a mesma concessão que `Card.atributo` recebeu.

Mora **na zona**, ao lado de `equips`, pelo mesmo motivo: quando o hospedeiro é destruído a zona
vira `{ occupied: false }` e a maldição some junto, sem nenhum código de limpeza e sem como vazar
uma maldição órfã. Um monstro que troca de posição, por outro lado, **mantém** a maldição: ela é
da zona ocupada, não da postura.

`PublicMonsterZone` também carrega o campo. O oponente enxerga a maldição pelo mesmo motivo que
enxerga os equipamentos: ela foi aplicada por uma jogada que ele testemunhou, e o combate a
aplica de qualquer forma.

## 4. Comportamento

**Ação:** `activate_spell { handIndex }`. Consome a jogada da mão; a carta resolve e sai de jogo.

**Varredura:** `P1` e depois `P2`, zonas `0 → 4`, independente de quem lançou.

**Acumula.** Lançar Spellbinding Circle e depois Shadow Spell no mesmo monstro deixa
`curseLevels: 3`, ou seja −1500/−1500. Não há teto e não há piso: o ATK efetivo pode ficar
negativo, exatamente como `calculateEffectiveAtkDef` já permitia, e a tabela de combate compara os
números como eles são.

**Como chega ao combate:** `cursePenalty(zone.curseLevels)` entra no slot `equipment` de
`zoneCombatProviders`, somado ao bônus dos equipamentos. Ver
[`equip-buffs.md`](./equip-buffs.md) §4 para por que não é um quarto provedor.

## 5. Eventos

**Nenhum**, nas três cartas — igual à trava de ataque. A maldição é estado que os provedores de
combate leem, e `EVENT_TYPES` continua fechado em dez tipos ([`README.md`](./README.md) §6).
Fixado num teste (`"a maldicao nao emite evento — e estado que o combate le"`), para que a
ausência seja deliberada e não um esquecimento.

Um campo sem nada a amaldiçoar — ou sem nada a limpar — é jogada legal: gasta o turno e emite só
o `onSet` da ativação.

## 6. Recusas

Idênticas às de [`destruction.md`](./destruction.md) §4.
