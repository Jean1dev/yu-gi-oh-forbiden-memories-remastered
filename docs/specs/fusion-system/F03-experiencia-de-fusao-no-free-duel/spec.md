# Experiência de Fusão no Free Duel

## 1. Contexto e Escopo

Expõe F02 no duelo web. A UI coleta ordem e destino, mas não calcula legalidade: o runtime compõe o mesmo resolver injetado no motor. Segue `docs/arquitetura.md` §7, ADR-004 e ADR-009.

### Incluído
- Carga memoizada da tabela e payload compacto.
- Modo Fundir, badges, confirmação/cancelamento e feedback.
- Cues de etapas e colocação obrigatória.
- Responsividade, teclado e movimento reduzido.

### Adiado
- IA, online, preview, materiais do campo e enciclopédia de fusões.

### Decisões e Premissas
- Selecionar uma carta mantém ações normais e oferece Fundir; entrar no modo fixa essa carta como #1.
- Tocar numa carta alterna sua presença e renumera as restantes; máximo 5.
- Cancelar antes de `begin_fusion` não altera o motor; depois não há cancelamento.
- Tabela inválida desabilita somente Fundir.

## 2. Alocação no Monorepo

- `apps/web/src/lib/catalog/sealed-fusions.ts`: loader server-only memoizado.
- Página/tela de duelo: payload de fusões e status.
- `duel-runtime.ts`: índice/resolvedor e `createApply`.
- `duel-interaction.ts`: novos intents/eventos/slots.
- Componentes da mão, ações, mensagens e CSS do Free Duel.
- Cues, hooks e testes unitários/integração.

## 3. Design Técnico

O server component carrega catálogo e tabela da mesma fonte validada e converte receitas em tuples serializáveis. O runtime cria `FusionPairLookup` uma vez e fecha o `FusionResolver` sobre o catálogo. A máquina de intenção adiciona `choosing_fusion_materials` e variantes de colocação pendente.

Após `begin_fusion`, a tela deriva cues da resolução em `pending`, reproduz cada etapa uma vez e só então habilita o destino. Com movimento reduzido, pula temporizadores. O resultado não é renderizado antes de o motor aceitar a ação.

## 4. Contratos

- `FusionCatalogResult`: `ready(entries)`, `unavailable`.
- `DuelIntent` inclui seleção ordenada e destinos de pendência.
- `ActionSlotId` inclui `fusion`, `confirm_fusion` e `remove_fusion_material` quando aplicável.
- `CreateDuelRuntimeInput` recebe `fusionEntries` ou indisponibilidade.

## 5. Modelo de Dados

Sem persistência. O payload contém apenas tuples de números e é reconstruído como Map no cliente; nunca inclui funções em props.

## 6. Tratamento de Erros e Casos de Borda

- Menos de 2 selecionadas desabilita confirmação; sexta carta é ignorada com feedback.
- Mudança de estado invalida seleção e retorna ao idle.
- Recusa do motor mantém mensagem e reconcilia intent.
- Tabela indisponível mostra “Fusões indisponíveis.” sem afetar ações normais.

## 7. Estratégia de Testes

- Reducer de intenção cobre entrada, ordem, toggle, renumeração, limite e cancelamento.
- Componentes cobrem badges, ARIA, teclado e layouts.
- Cues cobrem sucesso/falha e reduced motion.
- Integração real resolve uma sequência, mantém resultado oculto e conclui todos os modos.

