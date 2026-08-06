# Plano de Implementação — Determinismo, Limites e Falha Segura

> Spec: `./spec.md`

## Pré-requisitos

- **Dependências internas do módulo:** F01 (agente/registro), F03 (candidatos legais) e F04
  (`fm-basic` e pontuação) concluídas conforme suas specs; F02 chega transitivamente por F03/F04.
- **Contrato cross-PRD já implementado:** Motor de Duelo 1x1 completo, incluindo inicialização
  semeada, `apply`, projeção pública e desfecho exclusivo do motor.
- **Contrato do Free Duel já implementado:** `advanceCpuDecisions` e
  `MAX_CPU_ACTIONS_PER_ADVANCE = 100` permanecem como guarda autoritativo do turno.
- **Roster e catálogo:** Teana e Jono devem estar disponíveis com decks válidos para a prova de
  partida completa; nenhum valor de balanceamento novo é necessário.
- **Pipeline de F04:** estender `packages/ai/src/strategy/fm-basic/` sem criar seletor ou política
  paralelos; categorias e tuplas de qualidade existentes continuam sendo a base da escolha.

## Fase 1: Ordem determinística total

**1. Metadados de desempate** — Consolidar na saída pontuada de F04 a origem estável necessária
para comparar candidatos sem depender da ordem incidental de objetos ou coleções.

**2. Seletor determinístico** — Introduzir a seleção por pontuação e pelos desempates definidos
na spec, incluindo validação de valores impossíveis e fallback para lista vazia.

**3. Integração com `fm-basic`** — Fazer a política usar exclusivamente o seletor total e encerrar
cada caminho sem jogada selecionável com avanço de fase.

## Fase 2: Fronteira que nunca derruba a partida

**4. Validação defensiva** — Validar o estado público na entrada do agente com o schema existente,
sem reparar dados nem invocar a política quando o contrato estiver malformado.

**5. Captura segura da decisão** — Endurecer o adaptador assíncrono para converter falhas
síncronas e assíncronas de toda a cadeia de decisão na ação segura definida na spec.

**6. Observabilidade em melhor esforço** — Emitir os avisos e erros estruturados sem permitir que
logger ou espera de apresentação quebrem a garantia de resolução do agente.

## Fase 3: Limites e integração do turno

**7. Composição do agente endurecido** — Atualizar o composition root do Free Duel para usar a
versão final do agente, preservando o contrato e o guarda existentes.

**8. Terminação do turno** — Exercitar estados densos e sequências completas da CPU para provar
que a política progride a máquina e devolve controle antes do teto do orquestrador.

**9. Partida completa reproduzível** — Montar o fluxo com motor, roster e IA reais, registrando
ações/eventos suficientes para comparar execuções com a mesma seed e confirmar o desfecho do
motor.

## Fase 4: Provas de qualidade e desempenho

**10. Propriedades de determinismo e não mutação** — Adicionar os testes property-based do
seletor e do agente junto dos componentes, cobrindo repetição, entradas arbitrárias e imutabilidade.

**11. Matriz de falhas seguras** — Cobrir estado malformado, exceção, rejeição, score inválido,
logger e espera falhos, comprovando que nenhuma Promise de decisão rejeita.

**12. Budget de decisão** — Implementar a medição representativa de campo cheio sem setup ou
pausa e registrar a asserção de p95 abaixo do limite do PRD.

**13. Portão arquitetural** — Ligar ao lint a verificação de ausência de PRNG, I/O, UI e estado
privado no pacote de IA, mantendo a direção de dependências travada.

**14. Validação final** — Rodar formatação, lint e fronteiras, typecheck, testes unitários,
property-based e de integração, comparando o resultado com todos os critérios da Seção 7 da spec.
