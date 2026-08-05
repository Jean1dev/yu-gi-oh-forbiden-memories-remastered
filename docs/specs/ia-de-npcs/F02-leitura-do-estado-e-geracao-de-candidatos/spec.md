# Leitura do Estado e Geração de Candidatos

> PRD: `docs/prds/ia-de-npcs.md` — F02
> Pacote-alvo: `packages/ai`

## 1. Contexto e Escopo

Esta feature transforma a visão pública recebida pelo agente em uma lista explícita de ações plausíveis para o NPC. Ela é a primeira etapa funcional da decisão: enumera possibilidades, mas não decide legalidade nem preferência. O filtro autoritativo pertence à F03 e a pontuação pertence à F04.

A implementação inaugura a lógica de domínio de `packages/ai` prevista em `docs/arquitetura.md` §2 e integra a Fase 3 do roadmap (`docs/arquitetura.md` §9). Ela opera somente sobre `PublicDuelState` e contratos de ação de `packages/shared`, preservando o motor como fonte única das regras conforme `docs/arquitetura.md` §§1 e 3 e ADR-002.

### Incluído

- Receber a chamada de decisão encaminhada pela F01 e ler a visão pública do duelo pela ótica do NPC.
- Enumerar candidatos de invocação para cada monstro da mão própria, zona de monstro livre e uma das quatro posições.
- Enumerar candidatos de magia, armadilha e equipamento conforme o modo de jogo já descrito pela tabela compartilhada de efeitos.
- Enumerar uma mudança de posição por monstro próprio ocupado.
- Enumerar ataques de monstros próprios ainda não usados contra cada zona adversária ocupada, ou ataques diretos quando todas estão vazias.
- Acrescentar `advance_phase` em todo estado, inclusive quando nenhuma outra categoria produzir candidato.
- Preservar uma ordem canônica determinística e nunca produzir `surrender` ou `resolve_attack`.

### Fronteiras

- A feature não verifica fase, jogador ativo, uso da ação principal, restrições de alvo, ataque no primeiro turno ou qualquer outra legalidade; F03 consulta `packages/engine` para isso.
- A feature não pontua, ordena por qualidade nem escolhe a ação final; essas responsabilidades são de F04 e F05.
- Fusão, ritual, tributo, mão variável e resposta a janela de reação permanecem fora de escopo conforme `docs/prds/ia-de-npcs.md` §7.
- A feature não consulta `DuelState`, deck ou mão ocultos, nem encerra o duelo; projeção e desfecho continuam pertencendo ao Motor de Duelo 1x1.
- Não há UI, pausa de apresentação, log, rede ou persistência nesta feature.

### Contratos externos assumidos

- `ia-de-npcs`/F01 fornece o scaffold de `packages/ai`, a fronteira do agente e o encaminhamento de `PublicDuelState` para a geração de candidatos.
- `motor-duelo-1x1`/F04 fornece, por `packages/rules#getPublicDuelState`, a projeção pública em que a mão própria é visível, a adversária expõe apenas contagem e cartas adversárias ocultas não são reveladas.
- `motor-duelo-1x1`/F08–F11 fornece em `packages/shared` o vocabulário fechado das ações enumeráveis nesta versão.

### Decisões e Premissas

| # | Decisão / Premissa | Origem | Status |
|---|--------------------|--------|--------|
| 1 | A lista usa `readonly DuelAction[]` como contrato público do pacote; não cria um DTO duplicado em `shared`, pois o elemento já é o contrato compartilhado do motor. | `docs/arquitetura.md` §2; guidelines §§3.2 e 10; auto-aceite: recomendação técnica clara | a confirmar |
| 2 | A geração é uma função síncrona, pura, total para entradas conformes e sem PRNG; não muta o estado nem as ações produzidas. | ADR-001; ADR-002; guidelines §§1, 7 e 19 | confirmada |
| 3 | A ordem canônica é: varrer a mão por índice; dentro de cada carta, destinos por menor índice; posições na ordem declarada pelo contrato; depois mudanças de posição, ataques e, por último, `advance_phase`. | auto-aceite: especificação parcial → default consistente e determinístico | a confirmar |
| 4 | As quatro posições de invocação seguem a ordem `attack_face_up`, `attack_face_down`, `defense_face_up`, `defense_face_down`, igual à ordem do union type existente. | auto-aceite: especificação parcial → default consistente com o código | a confirmar |
| 5 | Cartas mágicas são classificadas por `spellPlayMode`: `place` gera uma ação por zona de magia livre; `terrain` e `one_shot` geram uma ação sem destino; `equip` gera uma ação por monstro próprio ocupado. Isso reutiliza a semântica data-driven existente sem reimplementar efeitos. | `docs/arquitetura.md` §§1, 3.4; auto-aceite: recomendação técnica clara | a confirmar |
| 6 | A enumeração aplica apenas filtros estruturais expressos pela F02 (tipo da carta, zona livre/ocupada, `hasAttacked` e campo adversário vazio); toda precondição autoritativa permanece em F03. | PRD F02 Capabilities; ADR-002 | confirmada |
| 7 | Se, contra o contrato, a mão do jogador ativo estiver oculta, a geração não tenta inferi-la e devolve somente `advance_phase`; validação zod de estado malformado e fallback com log pertencem à fronteira do agente em F05. | auto-aceite: descrição parcial → falha segura mínima | a confirmar |
| 8 | O código existente já materializa `packages/shared`, `packages/rules` e `packages/engine`; F02 deve seguir seus nomes de arquivos em kebab-case, objetos `Readonly` e testes co-localizados com Vitest/fast-check. | descoberta de padrões; guidelines §§5, 6, 11 e 13 | confirmada |

## 2. Alocação no Monorepo

| Arquivo | Pacote | Novo/Alterado | Responsabilidade |
|---------|--------|---------------|------------------|
| `packages/ai/src/candidates/generate-candidates.ts` | ai | novo | Orquestrar a enumeração pura e devolver a lista canônica completa. |
| `packages/ai/src/candidates/generate-summon-candidates.ts` | ai | novo | Produzir combinações de monstro da mão, zona livre e posição. |
| `packages/ai/src/candidates/generate-spell-candidates.ts` | ai | novo | Produzir jogadas de posicionamento, terreno, ativação imediata e equipamento conforme o modo compartilhado. |
| `packages/ai/src/candidates/generate-position-candidates.ts` | ai | novo | Produzir uma mudança de posição para cada monstro próprio ocupado. |
| `packages/ai/src/candidates/generate-attack-candidates.ts` | ai | novo | Produzir ataques contra monstros adversários ou ataques diretos. |
| `packages/ai/src/candidates/player-view.ts` | ai | novo | Resolver, sem inferência oculta, os lados próprio e adversário da visão pública. |
| `packages/ai/src/candidates/index.ts` | ai | novo | Exportar a API estável do submódulo de candidatos. |
| `packages/ai/src/candidates/generate-candidates.test.ts` | ai | novo | Cobrir composição, tetos, visibilidade, ordem e categorias proibidas. |
| `packages/ai/src/candidates/generate-candidates.properties.test.ts` | ai | novo | Provar determinismo, não mutação e invariantes da lista sobre estados públicos gerados. |
| `packages/ai/src/index.ts` | ai | alterado | Reexportar `generateCandidates` pela superfície pública criada em F01. |

**Verificação da direção de dependências:** `packages/ai` importa somente contratos e helpers puros de `packages/shared`; nesta feature não precisa importar `packages/engine`, `packages/rules`, apps ou adaptadores de I/O. Isso respeita `shared ← data ← rules ← engine ← ai` de `docs/arquitetura.md` §2. A projeção pública é criada antes da chamada por `packages/rules`; `ai` não inverte essa dependência nem recebe `DuelState` privado.

## 3. Design Técnico

### Estruturas de dados

- **Entrada:** `PublicDuelState` e o identificador do NPC (`PlayerId`) recebido do contexto interno da F01. O identificador explicita de qual lado a mão deve estar visível e evita assumir permanentemente `P2` dentro do gerador.
- **Saída:** coleção imutável de `DuelAction`, sem metadados de score ou estado resultante. Cada ocorrência representa uma combinação concreta, mesmo quando duas cópias da mesma carta geram ações semelhantes: `handIndex` distingue as cópias.
- **Visão resolvida:** estrutura interna com `selfPlayerId`, `opponentPlayerId`, `self` e `opponent`. Ela referencia somente os dois `PublicPlayerState` recebidos; não materializa informação privada adicional.
- **Constantes locais:** a sequência das quatro `MonsterPosition` e os cinco índices de zona são tuplas imutáveis, usadas como fonte única da ordem canônica.

### Fluxo

1. Resolver os lados próprio e adversário pelo `PlayerId` fornecido.
2. Se a mão própria não estiver visível, encerrar a enumeração com apenas `{ "type": "advance_phase" }`.
3. Percorrer as cartas da mão em índice crescente. Para cada `tipo: "monstro"`, combinar cada uma das até 5 zonas de monstro livres com as 4 posições, produzindo no máximo 100 candidatos de invocação para uma mão inicial de 5 monstros.
4. No mesmo percurso da mão, classificar cartas não-monstro pelo modo data-driven compartilhado. Gerar destinos em índice crescente: zonas de magia livres para `place`, monstros próprios ocupados para `equip`, ou uma ação sem destino para `terrain` e `one_shot`.
5. Percorrer as 5 zonas próprias em índice crescente e produzir `change_position` para cada monstro ocupado. A legalidade da mudança permanece para F03.
6. Percorrer monstros próprios ocupados com `hasAttacked: false`. Se houver ao menos um monstro adversário, produzir um candidato por alvo ocupado em índice crescente; se não houver nenhum, produzir um ataque direto por atacante. O teto é 25 ataques contra alvos, ou 5 diretos; portanto nunca excede 30 no conjunto dos dois cenários descritos pelo PRD.
7. Acrescentar exatamente um `advance_phase` ao fim da lista. Não gerar `surrender`, `resolve_attack` nem qualquer variante futura desconhecida.

### Regras de negócio

- A combinação máxima de invocação é `5 cartas × 5 zonas × 4 posições = 100`.
- Zonas são identificadas por `ZoneIndex` fechado (`0` a `4`); não se produz índice fora desse intervalo.
- Apenas cartas presentes na mão pública própria podem originar uma ação com `handIndex`.
- Informações do oponente usadas na geração limitam-se à ocupação das zonas e flags públicas. O conteúdo de `PublicCard { visible: false }` nunca é acessado nem reconstruído.
- `advance_phase` aparece exatamente uma vez e sempre na última posição.
- `surrender` é proibida para NPC pela F02; `resolve_attack` é drenada pela orquestração e está fora do módulo conforme o PRD §7.
- A geração não limita a uma ação principal, não bloqueia primeira batalha e não interpreta janela de reação: são regras do motor, filtradas por F03.

### Eventos

F02 não emite nem resolve eventos do motor. Ela apenas monta intents do union `DuelAction`; os eventos correspondentes surgem quando F03 ou o orquestrador aplica uma ação no motor.

### Determinismo e pureza

Todos os módulos são funções puras: sem I/O, timers, logging, estado global mutável ou `Math.random()`. A ordem depende somente da estrutura JSON recebida e de tuplas constantes. A entrada e seus arrays aninhados não são ordenados, reescritos ou mutados; repetir a chamada com a mesma visão e o mesmo lado produz lista profundamente idêntica. Embora consuma contratos do motor, F02 não altera `atk`/`def` nem qualquer estado de duelo.

## 4. Contratos

### Tipos existentes consumidos (`packages/shared`)

- `PublicDuelState`: visão pública com `players`, `activeField`, `activePlayer`, `turn`, `phase`, reação e bloqueios públicos opcionais.
- `PublicPlayerState`: `lp`, `hand`, `remainingDeck` e `field`; apenas a variante `hand.visible: true` permite enumerar cartas.
- `DuelAction`: union fechado de ações aceitas pelo motor. F02 produz apenas `summon_monster`, `play_spell_or_trap`, `equip_card`, `activate_spell`, `play_field_spell`, `change_position`, `declare_attack` e `advance_phase`.
- `PlayerId`, `ZoneIndex`, `MonsterPosition` e `ZoneReference`: identificadores fechados reutilizados sem redefinição.

Nenhum schema zod novo é necessário: a validação de `PublicDuelState` já existe em `PublicDuelStateSchema`, e esta função é uma fronteira interna tipada. A fronteira tolerante a dados malformados pertence ao agente da F05.

### Funções públicas

```text
generateCandidates(state: PublicDuelState, forPlayer: PlayerId): readonly DuelAction[]
```

Pré-condições: `state` satisfaz `PublicDuelStateSchema`; `forPlayer` identifica o lado do NPC. Pós-condições: retorna array novo, determinístico e não vazio; não muta `state`; o último item é `advance_phase`; não contém `surrender` nem `resolve_attack`.

Exemplo de entrada mínima relevante:

```json
{
  "forPlayer": "P2",
  "state": {
    "activePlayer": "P2",
    "phase": "main",
    "turn": 2,
    "activeField": null,
    "players": {
      "P1": {
        "lp": 8000,
        "hand": { "visible": false, "count": 5 },
        "remainingDeck": 35,
        "field": { "monsters": [{ "occupied": false }, { "occupied": false }, { "occupied": false }, { "occupied": false }, { "occupied": false }], "spells": [{ "occupied": false }, { "occupied": false }, { "occupied": false }, { "occupied": false }, { "occupied": false }] }
      },
      "P2": {
        "lp": 8000,
        "hand": { "visible": true, "cards": [] },
        "remainingDeck": 35,
        "field": { "monsters": [{ "occupied": false }, { "occupied": false }, { "occupied": false }, { "occupied": false }, { "occupied": false }], "spells": [{ "occupied": false }, { "occupied": false }, { "occupied": false }, { "occupied": false }, { "occupied": false }] }
      }
    }
  }
}
```

Saída correspondente:

```json
[
  { "type": "advance_phase" }
]
```

Exemplos de candidatos produzidos quando suas fontes estruturais existem:

```json
[
  { "type": "summon_monster", "player": "P2", "handIndex": 0, "zoneIndex": 0, "position": "attack_face_up" },
  { "type": "play_spell_or_trap", "handIndex": 1, "zoneIndex": 0 },
  { "type": "equip_card", "handIndex": 2, "targetZone": { "player": "P2", "zoneType": "monster", "index": 0 } },
  { "type": "activate_spell", "handIndex": 3 },
  { "type": "play_field_spell", "handIndex": 4 },
  { "type": "change_position", "zone": { "player": "P2", "zoneType": "monster", "index": 0 } },
  { "type": "declare_attack", "attackerZoneIndex": 0, "targetZoneIndex": 1 },
  { "type": "advance_phase" }
]
```

### Contratos externos (cross-PRD)

- **A ser fornecido por `ia-de-npcs`/F01:** chamada do gerador com o mesmo `PublicDuelState` recebido por `AiAgent` e com o lado correto do NPC.
- **Já fornecido por Motor de Duelo 1x1:** `PublicDuelState`, `DuelAction` e `getPublicDuelState`. F02 consome a projeção pronta; não importa a função de projeção nem o estado privado.

## 5. Modelo de Dados

F02 não cria tabelas Postgres, stores IndexedDB, migrações ou arquivos de dados. Candidatos são valores transitórios em memória e não devem ser persistidos: podem ser regenerados deterministicamente a partir da visão pública. A classificação de magias consome a tabela compartilhada versionada que já existe em `packages/shared/src/duel/spell-effects/`; esta feature não duplica nem altera seus valores.

## 6. Tratamento de Erros e Casos de Borda

| Cenário | Detecção | Comportamento | Mensagem ao jogador |
|---------|----------|---------------|---------------------|
| Mão própria visível e vazia | `cards.length === 0` | Gera candidatos de campo cabíveis e mantém `advance_phase`. | Nenhuma; invisível. |
| Mão do lado solicitado está oculta | Discriminante `hand.visible === false` | Retorna somente `advance_phase`, sem inferir cartas. | Nenhuma; fallback seguro. |
| Todas as zonas de monstro ocupadas | Nenhuma zona livre na varredura | Produz zero invocações; outras categorias continuam. | Nenhuma. |
| Todas as zonas de magia ocupadas | Nenhuma zona livre na varredura | Não produz candidatos `place`; terreno, efeito imediato e equipamento mantêm seus destinos próprios. | Nenhuma. |
| Oponente possui monstros ocultos | Zona ocupada com `card.visible === false` | Pode referenciar apenas o índice da zona como alvo; nunca lê a carta. | Nenhuma. |
| Campo adversário vazio | Nenhuma zona adversária ocupada | Produz um ataque direto por monstro próprio ainda não usado. | Nenhuma. |
| Campo adversário parcialmente ocupado | Uma ou mais zonas ocupadas | Produz alvos somente para as ocupadas e nenhum ataque direto. | Nenhuma. |
| Monstro próprio já atacou | `hasAttacked === true` | Não origina candidato de ataque, conforme capability explícita da F02. | Nenhuma. |
| Fase ou jogador ativo incompatível | Campos públicos `phase`/`activePlayer` | Não tenta validar; candidatos estruturais seguem para o filtro de F03. | Nenhuma. |
| Janela de reação pública aberta | `pending` presente | Não gera resposta especial; a orquestração deve drená-la antes de chamar a IA. | Nenhuma. |
| Carta de magia sem efeito conhecido | `spellPlayMode` resolve como `place` | Pode gerar posicionamento em zona livre; F04 decide não escolher cartas inertes. | Nenhuma. |
| Entrada que não satisfaz o schema | Falha anterior na fronteira do agente | Fora da responsabilidade de F02; F05 captura e devolve `advance_phase`. | Nenhuma; eventual diagnóstico é log técnico. |

## 7. Estratégia de Testes

### Unitários (Vitest)

- `generateSummonCandidates cria exatamente 100 combinações para cinco monstros e cinco zonas livres` — verifica o teto e cada tripla mão/zona/posição uma única vez.
- `generateSummonCandidates não usa cartas não-monstro nem zonas ocupadas` — verifica os filtros estruturais.
- `generateSpellCandidates mapeia place equip terrain e one_shot para as variantes corretas` — cobre todos os modos da tabela compartilhada.
- `generateSpellCandidates ordena mão e destinos por índice crescente` — fixa a ordem canônica.
- `generatePositionCandidates cria uma ação por monstro próprio ocupado` — cobre campo vazio, parcial e cheio.
- `generateAttackCandidates cria produto cartesiano de atacantes disponíveis e alvos ocupados` — cobre até 25 ataques direcionados.
- `generateAttackCandidates cria ataque direto somente quando o campo adversário está vazio` — impede direto com qualquer alvo presente.
- `generateCandidates mantém advance_phase único e por último` — cobre estados vazios e cheios.
- `generateCandidates nunca inclui surrender ou resolve_attack` — protege as fronteiras do PRD.
- `generateCandidates com mão própria oculta não infere cartas` — verifica o fallback de visibilidade.
- `generateCandidates pode mirar zona adversária oculta sem ler PublicCard` — verifica que só a ocupação e o índice são usados.

### Property-based (fast-check)

- `generateCandidates mesma visão e mesmo jogador produz lista idêntica` — repete estados públicos válidos e compara profundamente as saídas.
- `generateCandidates não muta o estado público` — compara a entrada serializada antes e depois da chamada.
- `generateCandidates sempre termina em advance_phase e nunca fica vazia` — cobre combinações de mãos e campos.
- `generateCandidates handIndex sempre referencia a mão própria visível` — nenhum candidato referencia carta adversária ou índice inexistente.
- `generateCandidates zoneIndex sempre pertence ao intervalo fechado de zero a quatro` — cobre todas as referências de zona.
- `generateCandidates nunca ultrapassa os tetos de invocação e ataque` — no máximo 100 invocações para mão de 5 e no máximo 30 candidatos de ataque segundo os cenários do PRD.

### Integração

- `ai candidates consome getPublicDuelState sem acessar DuelState privado` — projeta estados reais para P1 e P2 e confirma que só a mão do lado solicitado origina candidatos.
- `ai candidates usa o mesmo vocabulário exportado por shared` — valida cada item com `ActionSchema` sem conversão ou DTO paralelo.
- `ai candidates acompanha spellPlayMode compartilhado` — cobre uma carta de cada modo conhecido e impede classificação duplicada no pacote de IA.

### Análise estática

- `packages/ai candidates respeita a fronteira de dependências` — nenhum import de apps, React, DOM, `fetch`, Supabase, filesystem ou estado privado do motor.
- `packages/ai candidates não usa Math.random timers ou estado global mutável` — garante pureza e determinismo conforme ADR-002 e ADR-008.
- `packages/ai candidates não contém checagens autoritativas de fase ou regra de combate` — revisão confirma que legalidade segue exclusiva em F03/engine.

### Testes de aceitação (critérios do PRD)

| Critério (`docs/prds/ia-de-npcs.md` §9) | Teste |
|------------------------------------------|-------|
| Com 5 zonas livres e 5 monstros na mão, produz 100 candidatos de invocação e nenhum a mais. | Fixture de campo vazio e mão visível com cinco monstros compara contagem e conjunto cartesiano exato. |
| Nenhum candidato referencia carta oculta adversária nem carta ausente da mão do NPC. | Propriedade valida todos os `handIndex` contra a mão própria e usa sentinelas nas cartas ocultas adversárias. |
| `advance_phase` está presente em todo estado testado. | Propriedade sobre estados públicos válidos exige ocorrência única no final. |
| Rendição nunca aparece entre os candidatos. | Varredura da lista em fixtures e propriedades rejeita `type: "surrender"`. |

### Testes de integração cross-feature e cross-PRD

| Critério | Teste |
|----------|-------|
| F01 encaminha estado e perfil para o pipeline que usa F02. | Teste de contrato injeta o gerador no agente da F01 e confirma que a lista vem da visão recebida, sem alteração da assinatura `AiAgent`. |
| F03 filtra exatamente a lista produzida por F02. | Teste de contrato entrega candidatos estruturais legais e ilegais ao filtro, preservando `advance_phase` como piso. |
| F04 pontua candidatos de F02 sem precisar acessar estado privado. | Fixture entrega somente visão pública e lista de F02 à política e verifica ausência de dependência em `DuelState`. |
| Trocar `profile.strategy` muda comportamento sem mudar a enumeração estrutural. | Integração F01/F02 prova que, para a mesma visão, o gerador independe da estratégia do roster (`free-duel` F01). |
| O desfecho segue exclusivo do motor. | A lista nunca contém rendição nem ação que grave resultado; `motor-duelo-1x1` F12 continua único responsável pelo fim. |
