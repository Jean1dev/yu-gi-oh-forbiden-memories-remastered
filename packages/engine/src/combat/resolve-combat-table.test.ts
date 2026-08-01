import { describe, expect, it } from "vitest";

import { resolveCombatTable } from "./resolve-combat-table.ts";

describe("resolveCombatTable", () => {
  it("ATK do atacante maior que ATK do defensor: defensor destruído, atacante sobrevive, dono do defensor toma a diferença", () => {
    const result = resolveCombatTable({
      attackerEffective: { atk: 2000, def: 1000 },
      defenderEffective: { atk: 1200, def: 800 },
      defenderPosition: "attack",
    });

    expect(result).toEqual({
      attackerDestroyed: false,
      defenderDestroyed: true,
      damage: { toAttackerOwner: 0, toDefenderOwner: 800 },
    });
  });

  it("ATK do atacante menor que ATK do defensor: atacante destruído, defensor sobrevive, dono do atacante toma a diferença", () => {
    const result = resolveCombatTable({
      attackerEffective: { atk: 1200, def: 800 },
      defenderEffective: { atk: 2000, def: 1000 },
      defenderPosition: "attack",
    });

    expect(result).toEqual({
      attackerDestroyed: true,
      defenderDestroyed: false,
      damage: { toAttackerOwner: 800, toDefenderOwner: 0 },
    });
  });

  it("ATK do atacante igual ao ATK do defensor: ambos destruídos, nenhum dano", () => {
    const result = resolveCombatTable({
      attackerEffective: { atk: 1500, def: 800 },
      defenderEffective: { atk: 1500, def: 1000 },
      defenderPosition: "attack",
    });

    expect(result).toEqual({
      attackerDestroyed: true,
      defenderDestroyed: true,
      damage: { toAttackerOwner: 0, toDefenderOwner: 0 },
    });
  });

  it("ATK do atacante maior que DEF do defensor: defensor destruído, nenhum dano", () => {
    const result = resolveCombatTable({
      attackerEffective: { atk: 2000, def: 800 },
      defenderEffective: { atk: 900, def: 1200 },
      defenderPosition: "defense",
    });

    expect(result).toEqual({
      attackerDestroyed: false,
      defenderDestroyed: true,
      damage: { toAttackerOwner: 0, toDefenderOwner: 0 },
    });
  });

  it("ATK do atacante menor que DEF do defensor: nenhuma destruição, dono do atacante toma a diferença", () => {
    const result = resolveCombatTable({
      attackerEffective: { atk: 1000, def: 800 },
      defenderEffective: { atk: 900, def: 1800 },
      defenderPosition: "defense",
    });

    expect(result).toEqual({
      attackerDestroyed: false,
      defenderDestroyed: false,
      damage: { toAttackerOwner: 800, toDefenderOwner: 0 },
    });
  });

  it("ATK do atacante igual ao DEF do defensor: nenhuma destruição, nenhum dano", () => {
    const result = resolveCombatTable({
      attackerEffective: { atk: 1500, def: 800 },
      defenderEffective: { atk: 900, def: 1500 },
      defenderPosition: "defense",
    });

    expect(result).toEqual({
      attackerDestroyed: false,
      defenderDestroyed: false,
      damage: { toAttackerOwner: 0, toDefenderOwner: 0 },
    });
  });

  it("ataque direto: nenhuma destruição, dano igual ao ATK efetivo do atacante", () => {
    const result = resolveCombatTable({
      attackerEffective: { atk: 1800, def: 1200 },
      defenderEffective: undefined,
      defenderPosition: undefined,
    });

    expect(result).toEqual({
      attackerDestroyed: false,
      defenderDestroyed: false,
      damage: { toAttackerOwner: 0, toDefenderOwner: 1800 },
    });
  });
});
