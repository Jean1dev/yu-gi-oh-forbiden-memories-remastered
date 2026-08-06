# Plano de Implementação — Leitura do Estado e Geração de Candidatos

> Spec: `./spec.md`

## Pré-requisitos

- F01 de IA de NPCs deve fornecer o scaffold de `packages/ai`, a superfície pública do pacote e a fronteira do agente que encaminha a visão pública.
- Os contratos `PublicDuelState`, `DuelAction`, identificadores e schemas do Motor de Duelo 1x1 devem permanecer disponíveis por `packages/shared`.
- A projeção `getPublicDuelState` do Motor de Duelo 1x1 deve continuar ocultando mão, deck e cartas baixadas do adversário conforme o contrato cross-PRD.
- A tabela compartilhada de modos de magia deve permanecer a fonte data-driven para distinguir posicionamento, equipamento, terreno e ativação imediata.
- As decisões auto-aceitas de ordem canônica e fallback para mão própria oculta devem ser revistas antes de alterar o contrato público descrito na spec.

## Fase 1: Base da enumeração

**1. Visão do NPC** — Criar o resolvedor interno dos lados próprio e adversário sobre o estado público, preservando integralmente as regras de visibilidade descritas na spec.

**2. Fontes canônicas de ordem** — Estabelecer as sequências estáveis usadas para percorrer zonas e posições, sem introduzir aleatoriedade ou estado mutável.

**3. Exportação do submódulo** — Preparar a superfície de candidatos dentro de `packages/ai` e conectá-la ao índice público criado pela F01.

## Fase 2: Geradores por categoria

**4. Candidatos de invocação** — Implementar a enumeração do produto cartesiano entre monstros da mão, zonas livres e posições, incluindo os tetos definidos no PRD.

**5. Candidatos de magia** — Implementar a enumeração de jogadas de magia, armadilha, equipamento e terreno a partir da classificação compartilhada, sem duplicar efeitos ou legalidade do motor.

**6. Candidatos de posição** — Implementar a geração de mudanças de posição para os monstros próprios ocupados.

**7. Candidatos de ataque** — Implementar a enumeração de alvos adversários e o caso exclusivo de ataque direto quando o campo adversário estiver vazio.

## Fase 3: Composição e garantias

**8. Composição da lista** — Reunir os geradores na ordem canônica e assegurar que o avanço de fase seja o piso único e final de toda lista.

**9. Fronteiras de informação** — Cobrir estados com cartas adversárias ocultas e mão própria indisponível, garantindo que nenhuma informação seja inferida ou buscada fora da visão recebida.

**10. Invariantes determinísticos** — Adicionar cobertura por exemplos e propriedades para não mutação, repetibilidade, referências válidas, limites de candidatos e ações proibidas.

## Fase 4: Integração do pacote

**11. Contrato com a projeção pública** — Validar o gerador contra visões reais produzidas pelo subsistema de regras para ambos os lados do duelo.

**12. Contratos com o pipeline de IA** — Validar a entrega da lista à F03/F04 e o encaminhamento pela F01 sem alterar a assinatura consumida pela orquestração.

**13. Portões de qualidade** — Executar formatação, lint, typecheck, testes do pacote e verificação de dependências, corrigindo qualquer violação das fronteiras descritas na spec.
