# Plano de Implementação — Distribuição: Bundle Offline + Fonte Autoritativa no Servidor

> Spec: `./spec.md`

## Pré-requisitos

- **F03-F08 implementadas** — catálogo, artes, fusões, Guardiões, terreno e drops precisam estar carregáveis por suas APIs públicas.
- **Artefatos gerados de F01/F02** — `packages/data/generated/cards.json`, `arts-manifest.json` e `dataset-seal.json` devem existir antes de `data:package`.
- **Dados externos pendentes** — fusões, Guardiões, terreno e drops podem permanecer vazios; o pacote deve transportá-los como estruturas válidas.
- **F10 ainda não implementada** — esta feature gera `data-package.payload.json`; versão, hash, assinatura, handshake e persistência ficam para F10.
- **`apps/server` ausente** — a implementação deve publicar contrato e loader para o servidor futuro, sem criar o servidor online completo.

## Fase 1: Payload Canônico

**1. Tipos e schemas de distribuição** — Criar o subsistema `packages/data/src/distribution` com tipos e schemas do payload único, incluindo catálogo, artes e as quatro tabelas auxiliares. O formato deve refletir a Seção 3 da spec e ser validado nas fronteiras.

**2. Montagem pura do pacote** — Implementar o núcleo que recebe as APIs já carregadas de F03-F08 e monta uma estrutura read-only. A montagem deve rejeitar catálogo/artes ausentes e aceitar tabelas pendentes vazias.

**3. Serialização determinística** — Adicionar a serialização canônica do payload, com ordenação estável e sem timestamp. Essa saída é o insumo direto para o hash de F10.

## Fase 2: Build e Carregamento

**4. Script de empacotamento** — Criar `packages/data/scripts/build-data-package.ts` para carregar catálogo e tabelas reais, montar o payload e escrever `packages/data/generated/data-package.payload.json`. O script deve retornar código de falha em qualquer precondição quebrada.

**5. Loader de disco** — Criar o adaptador Node que lê o payload gerado, revalida o schema e reconstrói as APIs read-only para testes, scripts e futuro `apps/server`.

**6. Exports e Turbo** — Publicar `@yugioh/data/distribution` e `@yugioh/data/distribution/disk`, adicionar `data:package` ao `package.json` e encaixar a task no `turbo.json` depois das validações de dados.

## Fase 3: Consumo Offline e Autoridade

**7. Adaptador web** — Adicionar em `apps/web` um loader fino para consumir o pacote assinado por F10 sem ler diretamente `cards.json` ou tabelas soltas. A camada web deve continuar traduzindo artes para `/cards-data/NNN.jpg`.

**8. Manifesto de precache de artes** — Derivar, a partir de `packagedArts`, a lista de URLs de arte que o PWA/service worker deve cachear. O plano não precisa implementar toda a política PWA, mas deve deixar a superfície pronta para ADR-004.

**9. Validação autoritativa de carta** — Implementar a função defensiva que resolve `numero` no pacote e rejeita atributos divergentes. Essa função será a porta obrigatória do servidor online futuro.

## Fase 4: Verificação

**10. Testes unitários do payload** — Cobrir completude, tabelas vazias, imutabilidade, serialização determinística e reconstrução das APIs públicas.

**11. Testes de autoridade** — Cobrir `numero` inexistente e atributos forjados, garantindo que nenhuma ação consumidora precise confiar em campos de carta vindos do cliente.

**12. Teste de integração real** — Rodar a construção do pacote sobre os artefatos reais de F01-F08 e validar que as 722 cartas, artes e tabelas atuais viajam no payload.
