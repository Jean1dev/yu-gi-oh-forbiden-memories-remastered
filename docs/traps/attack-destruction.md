# Armadilhas de Destruição em Ataque

| Número | Carta | Condição |
|---|---|---|
| 681 | House of Adhesive Tape | ATK efetivo ≤ 500 |
| 682 | Eatgaboon | ATK efetivo ≤ 1000 |
| 683 | Bear Trap | ATK efetivo ≤ 1500 |
| 684 | Invisible Wire | ATK efetivo ≤ 2000 |
| 685 | Acid Trap Hole | ATK efetivo ≤ 3000 |
| 686 | Widespread Ruin | qualquer ATK |

O gatilho ocorre em `onAttackDeclared`, para ataque direto ou com alvo. O ATK efetivo é calculado
com os modificadores disponíveis no instante da resolução. Se a trap disparar, o atacante é
destruído antes de revelar o defensor, consultar a tabela de combate ou causar dano.

