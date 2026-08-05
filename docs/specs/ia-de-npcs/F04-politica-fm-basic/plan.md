# Plano de Implementação — Política `fm-basic`

> Spec: `./spec.md`

## Pré-requisitos

- F01 implementada com `StrategyPolicy`, agente, registro e pausa de apresentação injetável.
- F02 implementada com geração ordenada de candidatos baseada exclusivamente no estado público.
- F03 implementada com candidatos aprovados pelo motor e estados públicos resultantes.
- Motor de Duelo 1x1 e tabela compartilhada de efeitos disponíveis pelas APIs públicas atuais.
- Free Duel com composition root do agente e perfis do roster de Teana/Jono.
- Matrizes de Guardiões Estelares e terreno podem permanecer ausentes; a implementação deve conservar o fallback neutro e nunca inventar valores.
- Revisar as premissas auto-aceitas de `defensiveThreshold`, score de magia imediata e relação entre `playsSpells`/`playsFieldSpells` antes de mudar os contratos da spec.

## Fase 1: Parâmetros e avaliação pública

**1. Parâmetros normalizados** — Implementar a leitura tolerante das quatro chaves reconhecidas, com os defaults e domínios definidos na spec.

**2. Estatísticas observáveis** — Criar a derivação pura de força dos monstros públicos, preservando dados ocultos e o fallback neutro das tabelas pendentes.

**3. Utilidade pública** — Preparar a comparação de estados resultantes usada somente para distinguir efeitos imediatos conhecidos.

**4. Cobertura da base** — Validar defaults, valores inválidos, informação oculta, modificadores neutros e não mutação dos objetos de entrada.

## Fase 2: Seletores de jogada

**5. Seleção de invocação** — Implementar a escolha do monstro mais forte e da posição ofensiva ou defensiva conforme a spec.

**6. Seleção de magia e equipamento** — Implementar o uso de efeitos conhecidos, hosts elegíveis, terreno habilitado e bloqueios dos parâmetros.

**7. Seleção de posição** — Implementar as mudanças ofensivas e defensivas sobre candidatos já aprovados pelo motor.

**8. Seleção de ataque** — Implementar ataques diretos e trocas favoráveis, incluindo agressividade, visibilidade e desempate de alvos.

**9. Cobertura dos seletores** — Exercitar cada ramo de heurística, limites de parâmetro, cartas inertes e empates estáveis junto ao componente correspondente.

## Fase 3: Política e registro

**10. Composição da política** — Reunir os seletores na precedência absoluta do PRD e garantir avanço de fase quando nenhuma jogada elegível existir.

**11. Contrato de estratégia** — Adaptar a seleção ao contrato de política de F01 sem adicionar espera, log, I/O ou estado mutável.

**12. Registro padrão completo** — Compor exatamente `passive` e `fm-basic` e trocar o composition root do Free Duel para usar esse registro.

**13. Propriedades da decisão** — Provar pertencimento ao conjunto legal, determinismo, estabilidade de desempate e imutabilidade do pipeline completo.

## Fase 4: Integração jogável

**14. Integração com motor e efeitos** — Validar candidatos, resultados especulativos, efeitos conhecidos e reaplicação autoritativa com os pacotes reais.

**15. Perfis do roster** — Exercitar Teana e Jono pela mesma política parametrizada e comprovar que a troca de `strategy` é exclusivamente data-driven.

**16. Partidas completas** — Rodar duelos com pausa zero até o desfecho do motor, observando invocações, ataques e ausência de ações recusadas.

**17. Portões de qualidade** — Executar formatação, lint, typecheck, testes e verificação de fronteiras, corrigindo violações da spec antes da entrega.
