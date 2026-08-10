# Plano de Implementação — Efeitos e Ativação Automática de Trap Cards

> Spec: `./spec.md`

## Pré-requisitos

- Motor-duelo-1x1 F02/F04/F09/F11 e Rating-engine F01 já implementados.
- Sistema de spells em `docs/spells/` já implementado e usado como precedente.
- Matrizes de Guardian Stars e terreno continuam neutras; nenhum valor será criado nesta feature.

## Fase 1: Documentação e vocabulário compartilhado

**1. Documentação normativa** — Publicar o catálogo das dez cartas, as regras transversais e as
famílias de gatilho em `docs/traps/`, corrigindo referências desatualizadas em spells e arquitetura.

**2. Contratos de efeito** — Adicionar ao pacote compartilhado o vocabulário, validação, tabela
imutável e consulta segura dos efeitos de trap descritos na spec.

**3. Publicação e cobertura do contrato** — Expor os novos contratos e cobrir cardinalidade,
validação, segurança de lookup e imutabilidade.

## Fase 2: Equipamentos reversíveis e cálculo efetivo

**4. Modelo de anexo** — Migrar o estado, schemas, projeções, serialização e fixtures para anexos
de equipamento com polaridade explícita.

**5. Modificador reversível** — Adaptar a soma de equipamentos e o cálculo efetivo para aplicar
polaridade, filtros de classe, acúmulo e piso zero sem alterar a carta base.

**6. Reverse Trap** — Integrar a ativação automática ao fluxo de equipamento, com revelação,
consumo e anexo reverso.

## Fase 3: Armadilhas de ataque

**7. Seleção e consumo determinísticos** — Criar o subsistema puro que localiza a primeira trap
compatível e produz os eventos comuns de ativação e consumo.

**8. Interceptação de combate** — Integrar 681–686 à resolução de ataques diretos e com alvo antes
da revelação do defensor, do combate e do dano.

**9. Cobertura de combate** — Cobrir limites, ATK efetivo, ordem por zona, traps incompatíveis e
ausência de efeitos posteriores ao ataque interceptado.

## Fase 4: Reações a magia, pontuação e experiência

**10. Reações de pontos de vida** — Integrar Goblin Fan e Bad Reaction à ativação de magias,
transformando o destinatário e a direção do delta na mesma transição.

**11. Contabilização composta** — Permitir múltiplos incrementos por transição e contabilizar cada
ativação exatamente uma vez para o dono da trap.

**12. Feedback e orquestração** — Adaptar cues e sessão do Free Duel para apresentar a ativação e
resolver todos os gatilhos automaticamente, incluindo Fake Trap inerte.

## Fase 5: IA e integração final

**13. Seleção pela CPU** — Fazer `fm-basic` reconhecer armadilhas conhecidas e escolher seu
posicionamento determinístico quando a prioridade de invocação não selecionar uma jogada.

**14. Cenários ponta a ponta** — Cobrir jogador e CPU baixando armadilhas, ocultação pública,
round-trip, determinismo e encerramento por dano refletido ou convertido.

**15. Publicação do subsistema** — Atualizar exports e READMEs, executar todos os portões do
repositório e conferir cada critério de aceite do PRD.
