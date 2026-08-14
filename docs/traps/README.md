# Sistema de Efeitos de Trap Cards

> Pacotes-alvo: `packages/shared` (vocabulário + tabela), `packages/engine` (resolução),
> `packages/ai` e `apps/web` (integração)

Este diretório especifica as dez armadilhas de Forbidden Memories. Todas são colocadas viradas
para baixo por `play_spell_or_trap`; o jogador não escolhe quando ativá-las. O motor verifica as
cinco zonas do dono, da 0 à 4, e ativa somente a primeira trap cuja condição seja satisfeita.

| Arquivo | Cartas |
|---|---|
| [attack-destruction.md](./attack-destruction.md) | 681–686 |
| [spell-reactions.md](./spell-reactions.md) | 687–688 |
| [reverse-equip.md](./reverse-equip.md) | 689 |
| [fake-trap.md](./fake-trap.md) | 690 |

Uma trap ativada é revelada, soma `triggeredTraps` ao dono e deixa o campo. Não existe cemitério no
estado atual. Traps incompatíveis permanecem baixadas. O vocabulário usa os dez tipos de evento já
existentes: `onFlip` identifica a ativação e `onDestroy` registra o consumo.

O catálogo de efeitos vive em `packages/shared/src/duel/trap-effects/`, seguindo a mesma decisão
arquitetural de `docs/spells/README.md`: dado estático compartilhado, interpretador puro no motor.

