# Rollout Completo do Catálogo

> PRD: `docs/prds/renderizacao-cartas.md` — F07
> Pacote-alvo: `packages/data`

## 1. Contexto e Escopo

Aplica ao catálogo canônico inteiro o pipeline já entregue por F02 e F03: tenta enriquecer as 722 cartas,
baixa e valida as artes crop disponíveis, mede a cobertura resultante e aposenta a imagem completa antiga
somente para cada carta que já estiver efetivamente coberta pelo `CardFrame`. As cartas que não puderem ser
migradas permanecem explicitamente pendentes no relatório e conservam `cards-data/NNN.jpg` como fallback.

### Incluído

- Seleção das 722 cartas canônicas nos scripts existentes de enriquecimento e download, sem reimplementar
  matching, rate limit, validação de resposta, download ou validação JPEG.
- Atualização versionada de `cards-data/enriquecimento-ygoprodeck.json`, do mapa de overrides e das artes em
  `cards-data/art/NNN.jpg` para todas as correspondências válidas encontradas.
- Relatório gerado de cobertura por carta, distinguindo migradas, pendentes de override, falhas transitórias
  e inconsistências locais.
- Validação de cobertura combinada: toda carta precisa ter ou enriquecimento + crop válidos, ou a imagem
  completa antiga disponível como fallback.
- Remoção seletiva de `cards-data/NNN.jpg` apenas para cartas migradas; a operação destrutiva exige uma
  opção explícita e só ocorre depois de um relatório válido.
- Reexecução da ingestão para gerar o catálogo e os manifestos coerentes com os ativos restantes.

### Adiado

- Inventar metadados ou arte para cartas sem equivalente válido no YGOPRODeck.
- Remover o mecanismo de fallback de F06 enquanto houver qualquer carta pendente.
- Editar descrições oficiais para refletir efeitos específicos de Forbidden Memories.

### Decisões e Premissas

| # | Decisão / Premissa | Origem | Status |
|---|--------------------|--------|--------|
| 1 | O lote completo reutiliza `runEnrichment` e `runDownload` com a sequência canônica `001`–`722`; `--all` apenas troca a lista-alvo. | PRD F07 Capabilities; F02/F03 | confirmada |
| 2 | Uma carta é `migrated` somente quando possui entrada de enriquecimento válida e um JPEG crop válido com lado maior ≥400px. Ter apenas um dos dois produz `inconsistent`, nunca autorização para apagar o fallback. | Objetivos 1, 2 e 4 do PRD | confirmada |
| 3 | A cobertura operacional é combinada: `migrated` ou `legacy_fallback`. Carta sem nenhuma das duas coberturas é hard fail. | PRD F06 fallback + pedido do usuário em 04/08/2026 | confirmada |
| 4 | Diferentemente do texto original do PRD, não é necessário atingir 722 cartas migradas para iniciar a aposentadoria. Cada `cards-data/NNN.jpg` é removido assim que aquela carta estiver migrada; imagens das pendentes permanecem como fallback. | Decisão explícita do usuário em 04/08/2026 | revisão confirmada |
| 5 | A remoção é feita por um comando dedicado em modo de simulação por padrão; `--apply` remove somente os caminhos exatos aprovados pelo relatório calculado na mesma execução. | Segurança operacional e guidelines § tratamento de erros | confirmada |
| 6 | Falhas `http_error` são pendências transitórias e não devem ser convertidas em overrides; `no_password_no_override`, `not_found` e `ambiguous` ficam rastreáveis para revisão manual. | PRD F02 Error Handling | confirmada |
| 7 | Relatórios e manifestos derivados ficam em `packages/data/generated/` e não são versionados; dados enriquecidos, overrides e JPGs crop são fontes versionadas. | `docs/arquitetura.md` §4.1 e ADR-003 | confirmada |
| 8 | Nenhuma tabela externa pendente da arquitetura (§10) é tocada por esta feature. | `docs/arquitetura.md` §10 | confirmada |

## 2. Alocação no Monorepo

| Arquivo | Pacote | Novo/Alterado | Responsabilidade |
|---------|--------|---------------|------------------|
| `packages/data/scripts/enrich-cards.ts` | data | alterado | aceita o catálogo canônico inteiro como lista-alvo do pipeline F02 |
| `packages/data/scripts/enrich-cards.test.ts` | data | alterado | prova a sequência `001`–`722` e preserva o comportamento do piloto |
| `packages/data/scripts/download-card-art.ts` | data | alterado | aceita a mesma lista completa no pipeline F03 |
| `packages/data/src/validation/check-card-frame-coverage.ts` | data | novo | função pura que classifica cobertura migrada, fallback, pendência e inconsistência |
| `packages/data/src/validation/check-card-frame-coverage.test.ts` | data | novo | testes da matriz de cobertura e da autorização de remoção |
| `packages/data/scripts/rollout-card-frame.ts` | data | novo | adapter de I/O que gera relatório, simula ou aplica as exclusões seletivas |
| `packages/data/scripts/rollout-card-frame.test.ts` | data | novo | integração em diretório temporário, incluindo preservação dos fallbacks |
| `packages/data/src/validation/check-art-coverage.ts` | data | alterado | passa a aceitar cobertura combinada de arte crop migrada ou arte completa legada |
| `packages/data/src/validation/check-art-coverage.test.ts` | data | alterado | regressão da cobertura combinada após remoções seletivas |
| `packages/data/scripts/ingest-cards.ts` | data | alterado | inclui a cobertura combinada no relatório da ingestão |
| `packages/data/tests/ingest-cards.integration.test.ts` | data | alterado | valida ingestão real com coexistência de crop e fallback legado |
| `packages/data/package.json` | data | alterado | expõe comandos explícitos de rollout e cobertura |
| `cards-data/overrides-nomes-ygoprodeck.json` | dados | alterado | mapeamentos manuais confirmados para cartas sem ID utilizável |
| `cards-data/enriquecimento-ygoprodeck.json` | dados | alterado | metadados válidos encontrados para o catálogo |
| `cards-data/art/NNN.jpg` | dados | ampliado | artes crop válidas encontradas no rollout |
| `cards-data/NNN.jpg` | dados | removido seletivamente | imagens completas somente das cartas classificadas como migradas |

Artefatos gerados, não versionados: `packages/data/generated/ygoprodeck-art-urls.json`,
`crop-arts-manifest.json` e `card-frame-coverage-report.json`.

**Direção de dependências:** toda a lógica e todo I/O permanecem em `packages/data`; `src/validation`
recebe estruturas já carregadas e continua puro, enquanto rede, disco e exclusão ficam em `scripts/`.
Não há import de `apps/*` nem inversão em `shared ← data ← rules ← engine ← ai`, conforme
`docs/arquitetura.md` §2, ADR-003 e ADR-008.

## 3. Design Técnico

### Seleção e execução do catálogo completo

`allCardNumbers()` produz exatamente 722 números, ordenados e preenchidos com três dígitos. Os entrypoints
de F02 e F03 mantêm o piloto como default e usam a lista completa somente com `--all`. Isso mantém os
comandos existentes retrocompatíveis e faz F07 reutilizar as mesmas fronteiras zod, rate limit e políticas
de erro.

O fluxo operacional é:

1. executar enriquecimento `--all` e persistir resultados válidos sem apagar enriquecimentos anteriores;
2. revisar pendências definitivas, adicionar overrides confirmados e repetir o enriquecimento;
3. executar download `--all`; downloads inválidos preservam qualquer crop anterior válido;
4. executar ingestão e o relatório de cobertura;
5. corrigir qualquer estado `uncovered` ou `inconsistent`;
6. executar o rollout primeiro em simulação e depois com `--apply`;
7. executar novamente ingestão, validações e relatório final.

### Classificação de cobertura

Para cada `CardNumber` canônico:

- `migrated`: enriquecimento válido e crop JPEG válido (lado maior ≥400px);
- `legacy_fallback`: ainda não migrada, mas `cards-data/NNN.jpg` existe;
- `inconsistent`: só uma das duas metades do CardFrame existe;
- `uncovered`: não está migrada e não possui imagem completa antiga.

O relatório agrega totais, listas ordenadas por status e `complete`, onde `complete` significa que as 722
cartas têm uma superfície renderizável (`migrated + legacy_fallback === 722`) e que não há inconsistências.
Ele também expõe `legacyFilesEligibleForRemoval`, que contém exclusivamente as cartas `migrated` cujo JPEG
legado ainda existe.

### Remoção seletiva

O script de rollout sempre calcula e grava o relatório antes de qualquer remoção. Sem `--apply`, apenas
imprime os caminhos elegíveis. Com `--apply`, exige `complete === true`, resolve cada alvo como
`cards-data/{numero}.jpg`, valida novamente que o caminho pertence à raiz exata e remove arquivo por arquivo.
Não usa glob nem remoção recursiva. Uma carta `legacy_fallback`, `inconsistent` ou `uncovered` jamais entra
na lista de exclusão.

### Ingestão e consumo

O manifesto crop continua sendo a única fonte de F06 para ativar `CardFrame`. O manifesto legado pode se
tornar parcial depois do rollout. A validação deixa de exigir arte completa para toda carta e passa a exigir
a união segura: crop utilizável para carta enriquecida ou arte completa. Assim, o dataset continua íntegro
sem forçar a manutenção duplicada dos dois JPGs.

## 4. Contratos

### Funções públicas

```text
allCardNumbers(): readonly CardNumber[]
checkCardFrameCoverage(input: CardFrameCoverageInput): CardFrameCoverageReport
runCardFrameRollout(options: CardFrameRolloutOptions): Promise<number>
```

`CardFrameCoverageInput` contém os 722 números canônicos, o conjunto de enriquecimentos válidos, as artes
crop validadas e os arquivos legados existentes. `runCardFrameRollout` recebe todos os caminhos por opção
para ser testável em diretórios temporários; produção fornece os defaults do repositório.

### Exemplo do relatório gerado

```json
{
  "totalCards": 722,
  "migrated": ["001", "002"],
  "legacyFallback": ["700"],
  "inconsistent": [],
  "uncovered": [],
  "legacyFilesEligibleForRemoval": ["001", "002"],
  "complete": true
}
```

O relatório não contém URLs remotas nem dados inventados. Pendências de matching continuam sendo emitidas
pelos outcomes de F02 e são correlacionadas pelo `numero` no resumo operacional.

## 5. Modelo de Dados

### Fontes versionadas

- `cards-data/enriquecimento-ygoprodeck.json`: `Record<CardNumber, CardEnrichment>` validado pelo schema de
  F01/F02; entradas existentes boas são preservadas em falhas posteriores.
- `cards-data/overrides-nomes-ygoprodeck.json`: `Record<CardNumber, string>`; somente equivalências
  verificadas manualmente.
- `cards-data/art/NNN.jpg`: JPEG crop válido com lado maior ≥400px.
- `cards-data/NNN.jpg`: conjunto parcial após o rollout, contendo apenas fallbacks ainda necessários.

### Derivados

- `packages/data/generated/card-frame-coverage-report.json`: relatório reproduzível e ordenado.
- `packages/data/generated/crop-arts-manifest.json`: manifesto derivado das artes crop reais.
- `packages/data/generated/arts-manifest.json`: manifesto parcial das imagens completas restantes.

Não há migração Postgres, IndexedDB ou mudança de schema de runtime nesta feature.

## 6. Tratamento de Erros e Casos de Borda

| Cenário | Comportamento |
|---------|---------------|
| API indisponível para uma carta | F02 reporta `http_error`, continua o lote e preserva dados anteriores; fallback legado permanece |
| Carta sem senha e sem override | reportada como pendente; nenhuma chamada por nome especulativa e nenhum dado inventado |
| Override ambíguo ou resposta inválida | carta não é migrada; fallback não é removido |
| URL ausente, 404, conteúdo não-JPEG ou crop pequeno | F03 não grava/substitui o arquivo; fallback não é removido |
| Enriquecimento sem crop ou crop sem enriquecimento | estado `inconsistent`; `--apply` falha antes de remover qualquer arquivo |
| Carta sem CardFrame nem JPEG legado | estado `uncovered`; `--apply` falha antes de remover qualquer arquivo |
| Falha ao remover um arquivo elegível | processo retorna erro, informa o `numero` e não tenta mascarar cobertura; nova execução é idempotente |
| Execução repetida | arquivos já removidos não voltam à lista; enriquecimento, download e relatório permanecem determinísticos para a mesma entrada |
| Caminho fora de `cards-data/NNN.jpg` | rejeitado antes da operação destrutiva |

## 7. Estratégia de Testes

### Unitários (Vitest)

`enrich-cards.test.ts`:
- `allCardNumbers retorna exatamente 001 a 722 em ordem`
- `o entrypoint sem --all preserva a lista piloto`

`check-card-frame-coverage.test.ts`:
- `classifica como migrated somente com enriquecimento e crop válidos`
- `classifica carta pendente com JPEG antigo como legacy_fallback`
- `reporta inconsistent quando só metade do CardFrame existe`
- `reporta uncovered quando não existe CardFrame nem fallback`
- `autoriza remoção somente do JPEG legado de carta migrated`
- `complete exige cobertura combinada das 722 cartas`

`rollout-card-frame.test.ts`:
- `dry-run gera relatório e não remove arquivos`
- `--apply remove JPEG legado de migrated e preserva legacy_fallback`
- `--apply não remove nada quando existe inconsistent ou uncovered`
- `rejeita alvo resolvido fora de cards-data`
- `segunda aplicação é idempotente`

### Integração

`ingest-cards.integration.test.ts`:
- `aceita manifesto legado parcial quando as cartas ausentes têm enriquecimento e crop`
- `falha quando uma carta não tem nem CardFrame válido nem imagem completa`
- `crop-arts-manifest permanece a fonte de ativação do CardFrame`

### Aceitação e rastreabilidade ao PRD

| Critério | Verificação |
|----------|-------------|
| Relatório mostra as 722 cartas migradas ou explicitamente pendentes | execução real de `rollout:card-frame` e teste de total/classificações |
| Imagens completas são removidas com segurança | revisão confirmada: teste prova remoção apenas de `migrated` e preservação de cada pendente como fallback |
| Mesmo pipeline de F02/F03 é usado no catálogo completo | testes de `allCardNumbers` e execução real dos comandos com `--all` |
| Campos de F01/F02 continuam sendo exatamente os consumidos por F04/F05 | ingestão real + suites existentes de `CardFrame` |
| Manifesto crop continua sendo a fonte de decisão de F06 | teste de integração da ingestão e suites existentes de `shouldUseCardFrame` |
| Carta migrada aparece nas telas e pendente preserva fallback | suites de integração de Library, Build Deck, Free Duel e Password entregues por F06 |

### Portões de arquitetura

- direção `shared ← data ← rules ← engine ← ai` verificada pelo check do repositório;
- toda resposta externa passa pelos schemas zod já entregues por F02/F03;
- nenhum valor de guardião, terreno, fusão, drop, rating ou balanceamento é criado;
- invariantes do jogo e contratos do motor não são alterados.
