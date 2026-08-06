# Plano de Implementação — Contrato do Agente e Registro de Estratégias

> Spec: `./spec.md`

## Pré-requisitos

- **Dependências internas:** nenhuma; F01 é a Foundation Feature de `ia-de-npcs`.
- **Contrato cross-PRD já implementado — Free Duel:** `AiAgent`, `DifficultyProfile`, composition
  root e orquestração existentes devem permanecer compatíveis sem mudança de assinatura.
- **Contrato cross-PRD já implementado — Motor de Duelo 1x1:** `PublicDuelState` e `DuelAction`
  publicados em `packages/shared` continuam sendo a entrada e saída do agente.
- **Dependência futura:** F04 fornecerá e registrará `fm-basic`; até essa wave, o registro de F01
  contém `passive` e qualquer outro nome usa o fallback seguro.
- **Decisões auto-aceitas a revisar:** registro imutável construído por composição, logger
  obrigatório injetado e validação antecipada de nomes/pausa, conforme a Seção 1 da spec.
- Não há pendência de dado externo, banco, cache, fila offline ou valor de balanceamento nesta
  feature.

## Fase 1: Fundação do pacote de IA

**1. Scaffolding de `packages/ai`** — Criar o pacote no workspace com configuração TypeScript,
scripts de qualidade e documentação coerentes com os pacotes existentes e com as fronteiras
definidas na spec.

**2. Contratos internos de estratégia** — Definir a superfície mínima e somente leitura que
permite ao agente selecionar políticas sem fechar as strings do roster nem duplicar os contratos
de `packages/shared`.

**3. Registro imutável** — Implementar a construção e consulta do registro, incluindo as falhas
antecipadas de configuração e a superfície pública descritas na spec.

## Fase 2: Agente seguro e política passiva

**4. Política `passive`** — Migrar o comportamento seguro para uma política do novo pacote,
mantendo a ação única de avançar fase e sem carregar efeitos de apresentação para a decisão.

**5. Adaptador `AiAgent`** — Criar o agente que seleciona a política pelo perfil, preserva os
parâmetros e aplica a pausa de apresentação, satisfazendo o contrato existente sem alterar sua
assinatura.

**6. Fallback e observabilidade** — Ligar estratégias vazias ou desconhecidas a `passive` e emitir
o aviso estruturado pela porta injetada, cobrindo os casos de borda definidos na spec.

## Fase 3: Composição no Free Duel

**7. Dependência do aplicativo** — Declarar e configurar `@yugioh/ai` como pacote consumido pelo
app web, preservando os portões de fronteira do monorepo.

**8. Troca no composition root** — Substituir a instanciação do andaime local pelo agente do
pacote e adaptar o logger estruturado da aplicação, sem tocar na sessão, store, hooks ou tela.

**9. Remoção do andaime local** — Excluir a implementação passiva duplicada no app depois que
seus consumidores e sua cobertura estiverem atendidos pelo pacote de IA.

## Fase 4: Verificação e entrega da Foundation

**10. Cobertura do pacote** — Adicionar os testes unitários e property-based do registro, da
política passiva, do fallback, do logging e da pausa no mesmo fluxo de implementação dos
componentes correspondentes.

**11. Integração do Free Duel** — Exercitar o composition root com perfis conhecido e
desconhecido, provando que a sessão continua usando o mesmo contrato e não falha por erro de nome
no roster.

**12. Portões do monorepo** — Validar formatação, lint e fronteiras, typecheck e suítes unitária
e de integração, confirmando também que `packages/ai` não ganhou I/O, UI ou dependência
invertida.
