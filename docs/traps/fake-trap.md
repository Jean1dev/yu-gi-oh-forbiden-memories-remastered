# 690 — Fake Trap

Fake Trap é uma isca deliberadamente sem efeito no Forbidden Memories. Pode ser baixada, permanece
oculta e não casa com nenhum gatilho. Se outra carta destruir a zona, ela sai normalmente e é
revelada pelo evento de destruição; não protege outras armadilhas como sua versão do TCG.

Por isso a CPU não a baixa: `selectSpell` (`packages/ai`) descarta o efeito `decoy` e continua
procurando. Baixá-la gastaria a única jogada de mão do turno numa carta que não pode fazer nada.

