# Plano de Implementação — Resolução de Pares e Sequências

## Pré-requisitos
- Catálogo e tabela-base de `banco-de-cartas/F03/F05` implementados.
- `docs/fusoes.md` e fontes upstream fixadas como evidência.

## Fase 1: Fonte e contratos
**1. Documentação executável** — Registrar schemas e arquivos compactos, revisar a pendência de F05 e expor os contratos serializáveis em `shared`.

**2. Pipeline** — Adicionar a tarefa de geração e seu manifesto ao pipeline de dados.

## Fase 2: Expansão validada
**3. Compilador** — Implementar a expansão determinística, precedências, receitas exatas e validação contra o catálogo.

**4. Artefato oficial** — Gerar e conferir os 50.242 pares versionados.

## Fase 3: Resolvedor puro
**5. Lookup e sequência** — Implementar o índice em memória e a redução ordenada em `rules`.

**6. Aceite** — Cobrir propriedades, casos representativos e integração com o catálogo real.

