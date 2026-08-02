# Plano de Implementação — Versionamento e Integridade da Distribuição

> Spec: `./spec.md`

## Pré-requisitos

- **F09 implementada** — `packages/data/generated/data-package.payload.json` deve existir e ser serialização canônica do conteúdo do pacote.
- **Artes acessíveis** — os arquivos de `cards-data/*.jpg` referenciados pelo payload precisam existir para cálculo dos digests.
- **Decisão de versão** — criar e manter `packages/data/dataset-version.json`; a versão é autoral e não pode vir de timestamp de build.
- **`apps/server` ausente** — implementar schemas e comparação de handshake, deixando o servidor online completo como consumidor futuro.
- **Save/Profiles ausente** — criar `dataset_versions` e documentar o contrato de `dataset_version`; alteração da tabela de perfis fica para o módulo dono.

## Fase 1: Identidade Compartilhada

**1. Schemas de dataset** — Criar em `packages/shared` os schemas e tipos de `DatasetIdentity` e das mensagens de handshake. Eles devem ser puros, sem dependência de `packages/data`.

**2. Arquivo de versão** — Adicionar `packages/data/dataset-version.json` e o schema de leitura correspondente. A implementação deve tratar versão ausente ou vazia como erro de publicação.

## Fase 2: Assinatura do Pacote

**3. Hash e digests** — Implementar cálculo SHA-256 do conteúdo canônico de F09 e dos JPGs referenciados. O hash deve mudar com qualquer alteração de carta, tabela auxiliar ou arte.

**4. Metadados e pacote final** — Implementar a assinatura que anexa metadata ao payload, produzindo `data-package.json` e `data-package-metadata.json`.

**5. Script e task de assinatura** — Criar `data:sign`, exportar os módulos de integridade e encaixar a task no Turbo depois de `data:package`.

## Fase 3: Verificação e Handshake

**6. Loader verificado** — Implementar o loader Node que lê o pacote final, recalcula hash/digests e só reconstrói o pacote F09 após integridade válida.

**7. Comparação de identidade** — Implementar a função de comparação `version` + `hash` e os retornos de aceite/recusa usados pelo Online Duel.

**8. Adaptador web** — Expor para `apps/web` a identidade local do pacote, para que o cliente envie o handshake e trate recusa por pacote desatualizado.

## Fase 4: Persistência e Seeds

**9. Tabela de versões** — Criar a migração `dataset_versions` com constraints e RLS de leitura. Escrita deve permanecer restrita a migração/serviço.

**10. Seed da versão atual** — Gerar uma migração/seed idempotente a partir de `data-package-metadata.json`, registrando versão, hash, algoritmo e contagens.

**11. Integração com economia** — Atualizar geradores que carimbam `dataset_version` para usar `data-package-metadata.json`. Isso substitui qualquer timestamp provisório por versão oficial.

**12. Contrato de Save** — Documentar e testar por contrato que Save/Profiles deve persistir `dataset_version` e sinalizar incompatibilidade quando a versão não existir em `dataset_versions`.

## Fase 5: Verificação

**13. Testes unitários de integridade** — Cobrir hash, digests, pacote adulterado, versão opaca e comparação de identidades.

**14. Testes property-based** — Cobrir determinismo do hash e regra de igualdade estrita do handshake.

**15. Testes de integração reais** — Assinar o pacote real de F09, verificar integridade, detectar adulteração de payload/arte e validar que seeds de banco usam a metadata oficial.
