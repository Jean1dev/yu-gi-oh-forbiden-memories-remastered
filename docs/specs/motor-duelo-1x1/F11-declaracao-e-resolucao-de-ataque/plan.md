# Plano de Implementação — Declaração e Resolução de Ataque

> Spec: `./spec.md`

## Pré-requisitos

- **F06 (Ciclo de Turno e Fases)** — tem spec, ainda sem implementação. Esta feature altera
  `packages/shared/src/duel/action.ts`/`action.schema.ts` e `packages/engine/src/turn/apply.ts`
  (arquivos criados por F06) e consome `isFirstDuelTurn` — pré-requisito de execução.
- **F04 (Cálculo de ATK/DEF Efetivo)** — já implementada. Consumida sem alteração
  (`calculateEffectiveAtkDef`, `CombatContext`, `ModifierProviders`, `EffectiveAtkDef`).
- **F02 (Barramento de Eventos e Janela de Reação)** — já implementada. Consumida sem alteração
  (`createEvent`, `openReactionWindow`, `closeReactionWindow`, `hasOpenReactionWindow`).
- **F01 (Modelo de Estado do Duelo)** — já implementado. `MonsterZone`, `MonsterPosition` reusados
  sem alteração.
- **F09 (Jogar Magia/Armadilha/Terreno)** — tem spec (mesma wave). Esta feature reutiliza
  `getOpponent`, exportado por `packages/engine/src/spells/opponent.ts`, em vez de duplicá-lo —
  ambas devem ser implementadas de forma que esse arquivo exista antes ou junto desta feature.
- **Sem pendência de dado externo além da já registrada na spec** (provedores de modificador
  neutros locais a esta feature, Decisão 6 — duplicação intencional documentada, não uma tabela
  pendente de valor).

## Fase 1: Contrato das duas ações

**1. Ação de declarar ataque** — Declarar o tipo que representa "declarar o ataque de um monstro
contra um alvo específico ou diretamente contra o oponente", identificando a zona do atacante e,
opcionalmente, a zona-alvo, acrescentado à união de ações já existente.

**2. Ação de resolver ataque** — Declarar o tipo que representa "resolver o ataque atualmente
pendente", sem nenhum parâmetro próprio, acrescentado à mesma união.

**3. Validação de fronteira das duas ações novas** — Declarar os schemas correspondentes,
estendendo a validação fechada da união de ações.

## Fase 2: Tabela de combate pura

**4. Função de resolução da tabela** — Implementar a função pura que, a partir dos valores
efetivos de ataque e defesa de atacante e defensor (ou a ausência de defensor, no caso de ataque
direto), decide quem é destruído e quanto dano cada lado recebe, cobrindo os seis ramos descritos
na especificação sem nenhuma leitura do estado do duelo.

## Fase 3: Declaração de ataque

**5. Validações de recusa da declaração** — Implementar, na ordem definida pela spec, as seis
checagens que impedem declarar um ataque: primeiro turno do duelo, zona do atacante vazia, atacante
fora de posição de ataque, atacante que já atacou, zona-alvo vazia quando informada, e ataque
direto bloqueado por monstros presentes no campo do oponente.

**6. Efeito da declaração bem-sucedida** — Implementar a transição que emite o evento de ataque
declarado, identificando as cartas e zonas envolvidas, e abre a janela de reação para o oponente,
sem aplicar nenhum dano ou destruição ainda.

## Fase 4: Resolução de ataque

**7. Guarda de pré-condição da resolução** — Implementar a checagem de que existe uma janela de
reação pendente especificamente sobre um ataque declarado antes de prosseguir com a resolução,
recusando caso contrário.

**8. Revelação do defensor face-baixo** — Implementar a etapa que, havendo um alvo e estando ele
face-baixo, revela sua posição para a face correspondente e emite o evento de revelação, antes de
qualquer cálculo de combate.

**9. Cálculo dos valores efetivos e aplicação da tabela** — Implementar a etapa que obtém o
ataque/defesa efetivos de atacante e, quando houver, defensor, usando o cálculo já existente com
provedores neutros locais a esta feature, e aplica o resultado da tabela de combate ao estado:
remoção de zonas destruídas, marcação do atacante sobrevivente como já tendo atacado, e dedução do
dano correspondente do LP de cada lado afetado, nunca abaixo de zero.

**10. Emissão dos eventos de resultado** — Emitir, na ordem correta, o evento de revelação (quando
houve), o evento de dano (quando houve algum) e um evento de destruição para cada monstro destruído
na resolução.

## Fase 5: Integração ao dispatcher central

**11. Roteamento no dispatcher** — Acrescentar ao ponto único de entrada do motor os dois casos que
delegam para a lógica de declarar e de resolver ataque, incluindo a recusa por ausência de janela
de ataque pendente antes de despachar a resolução.

## Fase 6: Publicação e verificação

**12. Exports públicos do subsistema** — Expor as três novas operações no ponto de entrada do
pacote do motor, ao lado das já existentes no mesmo subsistema de combate, e atualizar a descrição
desse subsistema no README do pacote.

**13. Testes unitários da tabela de combate** — Cobrir exaustivamente os seis ramos descritos na
especificação, incluindo os casos de empate e o ataque direto.

**14. Testes unitários da declaração de ataque** — Cobrir o caminho de sucesso com e sem alvo
específico, a emissão do evento e a abertura da janela de reação, e cada uma das seis recusas.

**15. Testes unitários da resolução de ataque** — Cobrir a revelação condicional do defensor, a
aplicação de dano e destruição em cada ramo da tabela, a marcação do atacante sobrevivente, o
fechamento da janela de reação, e a recusa quando não há ataque pendente.

**16. Teste de propriedade da tabela de combate** — Cobrir, por geração aleatória de valores de
ataque e defesa, que o resultado é sempre consistente com exatamente um dos seis ramos e nunca
produz dano negativo ou uma combinação de destruição impossível.
