# Reações a Magias

## 687 — Goblin Fan

Quando uma magia do oponente causaria dano de efeito ao dono da trap, previne esse dano e aplica a
magnitude integral ao conjurador. Dano de batalha, dano zero e efeitos do próprio dono não disparam.

## 688 — Bad Reaction to Simochi

Quando uma magia do oponente recuperaria LP do conjurador, substitui a cura por dano da mesma
magnitude ao conjurador. A trap é de uso único nesta implementação fiel ao fluxo do FM.

## O gatilho é o efeito, não o formato da carta

As duas reagem ao passo de `life_points`, onde quer que ele esteja: `firstLifePointsAtom`
(`packages/engine/src/spells/effects/life-points-atom.ts`) desce dentro de um `sequence` antes de
oferecer o gatilho, e `rewriteFirstLifePointsAtom` reescreve só esse átomo, preservando os demais
passos. Hoje nenhuma carta composta carrega LP — 348 Swords of Revealing Light é a única `sequence`
e não tem esse passo —, mas ler apenas o topo faria a próxima carta composta passar por cima das
duas traps sem nada para pegá-la.

