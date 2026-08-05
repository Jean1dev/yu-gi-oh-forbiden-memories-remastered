# Plano de Implementação — Jogada de Fusão no Motor

## Pré-requisitos
- Fusion System/F01 implementada.
- Motor F01/F02/F05/F06/F08/F09 implementado.

## Fase 1: Contratos e estado
**1. Ações e pendência** — Estender contratos, schemas, serialização e projeção pública com a transação de fusão.

**2. Composição** — Expor a factory do reducer com o resolvedor injetado e fallback explícito.

## Fase 2: Transação do motor
**3. Início** — Validar e consumir materiais, resolver a sequência e suspender para colocação.

**4. Conclusão** — Reutilizar as rotas existentes de carta e limpar a pendência somente no sucesso.

## Fase 3: Integração e aceite
**5. Fluxo sintético** — Exercitar início, snapshot e conclusão para cada tipo final.

**6. Portões** — Validar determinismo, estado serializável e fronteiras do engine.

