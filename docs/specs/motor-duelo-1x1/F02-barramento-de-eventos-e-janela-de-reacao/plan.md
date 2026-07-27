# Plano de Implementação — Barramento de Eventos e Janela de Reação

> Spec: `./spec.md`

## Pré-requisitos

- **Spec de `motor-duelo-1x1`/F01** (`docs/specs/motor-duelo-1x1/F01-modelo-de-estado-do-duelo/`).
  Ainda sem implementação. Esta feature estende o mesmo `EstadoDuelo`; não o redefine.
- **Scaffolding do monorepo** criado por `banco-de-cartas`/F01 (pnpm workspaces, Turborepo,
  TypeScript strict, Node.js 24 LTS). Esta feature cria o pacote `packages/engine` dentro desse
  scaffolding — não recria a base.
- **Nenhuma dependência cross-PRD bloqueante.** O Effect System (cross-PRD) consumirá o contrato
  desta feature futuramente; sua ausência não bloqueia F02, que apenas fornece o contrato.
- **Decisão de desenho confirmada na entrevista:** o campo `contexto` do evento é livre e
  serializável em JSON, sem forma fixa por tipo de evento.
- **Sem pendência de dado externo.** Nenhuma tabela de guardiões, terrenos, fusões, drops, rating
  ou balanceamento é tocada por esta feature.

## Fase 1: Vocabulário de evento e extensão do estado

**1. Vocabulário fechado de eventos** — Definir os dez tipos de gatilho e os dois vocabulários de
apoio (tipo de zona e índice de zona), usando exatamente os nomes já travados pelo PRD e por
`arquitetura.md`.

**2. Referência de zona e conteúdo do evento** — Definir a estrutura que aponta para uma zona sem
duplicar a carta ali, o tipo recursivo que garante que qualquer contexto extra seja serializável
em JSON, e o evento propriamente dito reunindo tipo, jogador de origem, cartas e zonas envolvidas
e esse contexto livre.

**3. Extensão do estado com a janela de reação** — Acrescentar ao `EstadoDuelo` já definido por F01
o campo opcional que representa uma janela de reação suspensa, sem alterar nenhum campo existente
daquele tipo.

**4. Par estado-mais-eventos** — Definir a estrutura genérica que qualquer ação futura vai devolver
ao aplicar uma mudança: o novo estado junto da lista ordenada de eventos que ela emitiu.

## Fase 2: Validação de fronteira

**5. Validação espelhando os novos tipos** — Construir, para cada estrutura da Fase 1, a validação
correspondente, incluindo a checagem recursiva do conteúdo livre do contexto e a extensão da
validação do estado do duelo para aceitar a janela de reação opcional.

**6. Constante do vocabulário de eventos** — Exportar a lista completa dos dez tipos de evento como
valor iterável, para reuso por quem precisar enumerá-los (testes, ferramentas, futuras features).

**7. Export público do pacote compartilhado** — Acrescentar os novos contratos ao ponto de entrada
público de `packages/shared`, na mesma convenção já usada pelos subsistemas existentes.

## Fase 3: Nascimento do pacote do motor

**8. Scaffold de `packages/engine`** — Criar o pacote pela primeira vez no monorepo: manifesto com
dependência apenas do pacote compartilhado, documentação de propósito e direção de dependência, e
ponto de entrada público — preparado para receber a lógica desta feature e, depois, a de F03 em
diante.

**9. Construtor de evento** — Implementar a função pura que monta um evento bem formado a partir do
mínimo de informação exigida, preenchendo os campos opcionais ausentes com valores neutros em vez
de deixá-los indefinidos.

**10. Mecânica de abrir e fechar a janela de reação** — Implementar as duas transições puras que
pausam e retomam o fluxo, cada uma recusando explicitamente a chamada fora da pré-condição
esperada (abrir com uma janela já aberta, fechar sem nenhuma aberta), e o predicado que outras
features vão usar como guarda antes de aceitar uma nova ação.

## Fase 4: Garantias e verificação

**11. Portão de análise estática do novo pacote** — Estender a verificação de fronteira de pacotes
para impedir que qualquer arquivo de `packages/engine` importe de fora de `packages/shared`, ou de
qualquer biblioteca de interface/IO — a primeira aplicação real do pilar "motor sem UI" em código
deste PRD.

**12. Testes unitários da mecânica de janela** — Cobrir a construção do evento, a abertura e o
fechamento da janela em seus casos de sucesso e de falha, e a validação de fronteira dos novos
tipos, na granularidade descrita na spec.

**13. Testes de propriedade da janela de reação** — Cobrir por geração aleatória o round-trip de
abrir seguido de fechar, e a garantia de que uma segunda abertura sempre falha independentemente
do conteúdo dos eventos envolvidos.
