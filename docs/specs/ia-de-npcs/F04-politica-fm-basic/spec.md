# Política `fm-basic`

> PRD: `docs/prds/ia-de-npcs.md` — F04
> Pacote-alvo: `packages/ai` + `apps/web`

## 1. Contexto e Escopo

Esta feature entrega a primeira estratégia ativa de NPC. A política `fm-basic` recebe o estado público, os parâmetros do perfil e somente candidatos aprovados pelo motor, então escolhe uma única ação por heurísticas determinísticas. Ela completa o caminho F01 → F02 → F03 → F04 sem alterar `AiAgent` e substitui, para perfis configurados com `strategy: "fm-basic"`, o comportamento inerte de apenas avançar fases.

A implementação pertence a `packages/ai`, consumidor superior de `shared` e `engine` conforme `docs/arquitetura.md` §2, e integra a Fase 3 do roadmap (§9). O escopo cobre deliberadamente **Core + Full Scope additions**: invocação, posição, ataque, magia de efeito conhecido, equipamento e terreno. Isso é necessário para que Teana e Jono usem as cartas conhecidas de seus decks, sem atribuir efeitos às cartas ainda inertes.

### Incluído

- Política única `fm-basic`, parametrizada e registrada sob a string aberta já consumida por F01.
- Seleção do monstro de maior ATK disponível e escolha entre ataque face-up e defesa face-down conforme o campo adversário visível.
- Mudança de posição ofensiva ou defensiva conforme as comparações do PRD.
- Ataques diretos e ataques contra alvos cuja troca seja favorável, processando atacantes por ATK decrescente.
- Uso de magia apenas quando a tabela compartilhada possui efeito conhecido.
- Equipamento aplicado ao monstro próprio de maior ATK que satisfaz a restrição de classe.
- Uso de terreno somente quando `playsFieldSpells` estiver habilitado.
- Interpretação tolerante de `aggression`, `playsSpells`, `playsFieldSpells` e `defensiveThreshold`, com defaults do PRD para valores ausentes ou de tipo/faixa inválidos.
- Ordem de preferência invocação → equipamento/magia conhecida → mudança de posição → ataque → avanço de fase.
- Integração da política ao registro padrão e ao pipeline do agente, sem mudar a pausa de apresentação de 650 ms definida em F01.

### Fronteiras

- A política não gera candidatos nem verifica legalidade: consome F02 e F03, e nunca chama regras paralelas para decidir se uma ação é aceita.
- O motor continua responsável por aplicar a ação, resolver combate, emitir eventos e apurar o desfecho (`docs/arquitetura.md` §§1 e 3; ADR-002).
- Fusão, ritual, tributo, resposta a janela, rendição, busca em profundidade, aprendizado, blefe e estratégias específicas de duelistas avançados permanecem fora de escopo conforme o PRD §7.
- A política não altera roster, deck, pausa visual, UI, sessão, recompensa ou persistência.
- Garantias globais de captura de exceção, limite por turno e fallback para estado malformado pertencem à F05; F04 já mantém funções puras e fallback normal para `advance_phase`.

### Contratos externos assumidos

- **F01:** fornece `StrategyPolicy`, agente, registro e encaminhamento dos `DifficultyProfile.parameters`.
- **F02:** fornece candidatos estruturais derivados exclusivamente do estado público.
- **F03:** fornece `LegalCandidate`, contendo ação aceita e `resultingState` público, e nunca entrega estado privado ou candidato recusado.
- **Motor de Duelo 1x1/F04 e F08–F11:** fornece cartas/zonas públicas, ações e transições usadas para avaliar o resultado sem duplicar legalidade.
- **Free Duel/F01:** fornece `profile.strategy` e `parameters` pelo roster; a implementação não codifica Teana ou Jono por nome.

### Decisões e Premissas

| # | Decisão / Premissa | Origem | Status |
|---|--------------------|--------|--------|
| 1 | A spec cobre Core + Full Scope additions, conforme aprovação explícita do lote para permitir o uso das magias e equipamentos conhecidos de Teana/Jono. | instrução do orquestrador; PRD F04 | confirmada |
| 2 | A escolha usa comparação lexicográfica por categoria, não pesos arbitrários somados: a primeira categoria com ao menos uma jogada elegível vence. | PRD F04 ordem de preferência; auto-aceite: recomendação técnica clara | a confirmar |
| 3 | Dentro de uma categoria, critérios de qualidade são comparados em tupla e o índice original na lista legal é o desempate final. Isso preserva a ordem canônica de F02 e prepara o desempate de F05. | PRD F05; auto-aceite: especificação parcial → default determinístico | a confirmar |
| 4 | `aggression === 0.5` mantém margem estrita; somente valor maior que `0.5` aceita empate, seguindo literalmente “acima de 0.5”. | PRD F04; auto-aceite: detalhe limítrofe omitido | a confirmar |
| 5 | `defensiveThreshold` é a margem mínima de segurança: mesmo vencendo, o monstro prefere defesa quando `atkPróprio - maiorAtkVisível <= defensiveThreshold`; valor negativo ou não finito volta a `0`. | auto-aceite: especificação parcial → interpretação conservadora | a confirmar |
| 6 | Comparações usam ATK/DEF efetivos observáveis: base da carta mais bônus de equipamentos públicos conhecidos. Guardião e terreno permanecem neutros enquanto seus valores/seleção não estiverem materializados, sem inventar modificadores. | `docs/arquitetura.md` §§3.1, 4.3 e 10; auto-aceite: tabela externa pendente → fallback neutro | pendente — aguarda dados |
| 7 | Monstro adversário face-down não participa de “maior ATK visível” nem é considerado troca comprovadamente favorável; a política pode avançar em vez de adivinhar seu valor. | PRD F02/F04 visibilidade; auto-aceite: default de menor privilégio | a confirmar |
| 8 | Entre alvos favoráveis, a política escolhe o maior valor de combate derrotável e depois o menor índice de zona; assim remove a maior ameaça conhecida sem olhar informação oculta. | auto-aceite: especificação parcial → heurística simples de mercado | a confirmar |
| 9 | Magias imediatas conhecidas só são elegíveis quando o estado público resultante melhora LP ou presença/força visível da CPU, ou reduz a do oponente. Magia conhecida com resultado público neutro não é escolhida. | auto-aceite: PRD exige “melhor jogada” mas não define score de magia | a confirmar |
| 10 | Equipamentos exigem efeito `equip_buff`, classe elegível e bônus positivo; o host de maior ATK efetivo vence, seguido pelo maior bônus total e pelos índices estáveis. | PRD F04; tabela compartilhada de efeitos | confirmada |
| 11 | Terreno conhecido é elegível quando `playsFieldSpells: true`; entre terrenos legais, prevalece o primeiro candidato estável porque as matrizes externas seguem neutras. | PRD F04; `docs/arquitetura.md` §4.3; auto-aceite: fallback neutro | pendente — aguarda dado |
| 12 | `playsSpells: false` desabilita equipamento e demais magias, inclusive terreno; `playsFieldSpells` apenas habilita terreno dentro do uso geral de spells. | auto-aceite: relação entre parâmetros omitida → interpretação consistente | a confirmar |
| 13 | Parâmetros desconhecidos são ignorados; tipo incorreto, `NaN`, infinito ou número fora da faixa usa o default individual, sem lançar e sem mutar o perfil. | PRD F01/F04; guidelines §§6–8 | confirmada |
| 14 | A política não depende de duelista específico, não usa PRNG e não tem I/O, timer ou logger. A pausa permanece no agente de F01. | PRD F04 Experience; ADR-001, ADR-002 e ADR-008 | confirmada |

## 2. Alocação no Monorepo

| Arquivo | Pacote | Novo/Alterado | Responsabilidade |
|---------|--------|---------------|------------------|
| `packages/ai/src/strategy/fm-basic/types.ts` | ai | novo | Tipos internos dos parâmetros normalizados e critérios de seleção. |
| `packages/ai/src/strategy/fm-basic/normalize-parameters.ts` | ai | novo | Aplicar defaults e faixas dos quatro parâmetros reconhecidos. |
| `packages/ai/src/strategy/fm-basic/normalize-parameters.test.ts` | ai | novo | Cobrir ausências, tipos incorretos, limites e chaves desconhecidas. |
| `packages/ai/src/strategy/fm-basic/visible-stats.ts` | ai | novo | Derivar ATK/DEF observáveis sem mutar base e com modificadores externos neutros. |
| `packages/ai/src/strategy/fm-basic/select-summon.ts` | ai | novo | Escolher monstro e posição de invocação. |
| `packages/ai/src/strategy/fm-basic/select-spell.ts` | ai | novo | Escolher efeito conhecido, equipamento elegível ou terreno habilitado. |
| `packages/ai/src/strategy/fm-basic/select-position-change.ts` | ai | novo | Escolher a melhor mudança ofensiva ou defensiva. |
| `packages/ai/src/strategy/fm-basic/select-attack.ts` | ai | novo | Escolher ataque direto ou troca favorável. |
| `packages/ai/src/strategy/fm-basic/select-action.ts` | ai | novo | Aplicar a precedência entre categorias e fallback de avanço. |
| `packages/ai/src/strategy/fm-basic/create-fm-basic-policy.ts` | ai | novo | Compor F02/F03 e adaptar o seletor ao contrato `StrategyPolicy` de F01. |
| `packages/ai/src/strategy/fm-basic/index.ts` | ai | novo | Exportar a política pela superfície estável do submódulo. |
| `packages/ai/src/strategy/fm-basic/fm-basic-policy.test.ts` | ai | novo | Cobrir heurísticas, parâmetros, ordem, visibilidade e fallback. |
| `packages/ai/src/strategy/fm-basic/fm-basic-policy.properties.test.ts` | ai | novo | Provar seleção pertencente aos legais, repetibilidade e não mutação. |
| `packages/ai/src/strategy/create-default-strategy-registry.ts` | ai | novo | Compor exatamente `passive` e `fm-basic` no registro padrão. |
| `packages/ai/src/strategy/create-default-strategy-registry.test.ts` | ai | novo | Provar as duas estratégias e o comportamento data-driven. |
| `packages/ai/src/index.ts` | ai | alterado | Reexportar política e registro padrão completos. |
| `apps/web/src/lib/free-duel/duel-runtime.ts` | web | alterado | Usar o registro padrão completo no composition root existente. |
| `apps/web/tests/free-duel-fm-basic.integration.test.ts` | web | novo | Integrar roster, candidatos legais, política, motor e sessão para Teana/Jono. |

**Verificação da direção de dependências:** `packages/ai` consome contratos de `packages/shared` e helpers puros já públicos do `packages/engine`, permitido por `shared ← data ← rules ← engine ← ai`. `apps/web` apenas compõe os pacotes. Nenhum arquivo em `shared`, `engine` ou `ai` importa React, DOM, `fetch`, Supabase ou código de app (`docs/arquitetura.md` §2; ADR-001). A política não recebe `DuelState` privado e não acessa dados ocultos.

## 3. Design Técnico

### Estruturas de dados

- **`FmBasicParameters`:** objeto somente leitura normalizado com `aggression` em `0..1`, `playsSpells`, `playsFieldSpells` e `defensiveThreshold` finito não negativo.
- **`LegalCandidate`:** contrato de F03 com `action` e `resultingState`. A política nunca considera uma ação fora dessa coleção.
- **`VisibleMonsterStats`:** ATK/DEF efetivos observáveis e identificação da zona; só existe quando a carta é pública. Para a CPU, seus monstros estão visíveis; para o oponente, monstros face-down não possuem stats.
- **`BoardUtility`:** tupla interna derivada da visão pública: diferença de LP, quantidade de monstros e soma de ATK/DEF observáveis. Serve apenas para distinguir efeitos imediatos conhecidos; não vira contrato persistido.
- **`RankedCandidate`:** referência ao candidato e tupla de critérios da categoria. O índice da entrada é sempre o último desempate e não é exposto fora do módulo.

### Fluxo

1. F01 resolve `fm-basic` e chama seu contrato existente com estado público e parâmetros. A política usa as dependências puras/injetadas de F02 e F03 para gerar e filtrar candidatos dentro da mesma decisão, sem ampliar `StrategyPolicy` nem `AiAgent`.
2. Normalizar somente as quatro chaves reconhecidas. Defaults: `aggression: 0.5`, `playsSpells: true`, `playsFieldSpells: false`, `defensiveThreshold: 0`.
3. Particionar o resultado legal por `action.type`, sem revalidar ações. A ordem original fica registrada para desempate.
4. **Invocação:** localizar entre candidatos legais a carta de maior ATK base na mão. Campo adversário vazio implica `attack_face_up`. Caso contrário, escolher `attack_face_up` somente se superar o maior ATK adversário visível com margem acima do `defensiveThreshold`; demais casos escolhem `defense_face_down`. Para a mesma carta/posição, menor zona vence.
5. Se não houver invocação elegível e `playsSpells` estiver ativo, avaliar equipamentos, magias imediatas e terreno. Equipar o host elegível de maior ATK; escolher magia imediata conhecida com maior ganho de utilidade público positivo; aceitar terreno somente com `playsFieldSpells` ativo. Cartas `place` sem efeito conhecido permanecem na mão.
6. **Mudança de posição:** usar o `resultingState` para confirmar a direção da mudança. Priorizar virar para ataque um monstro cujo ATK supere o maior ATK visível com a margem exigida; senão virar para defesa um atacante que não vença alvo visível e tenha DEF maior que ATK.
7. **Ataque:** considerar atacantes em ATK decrescente. Campo adversário vazio escolhe ataque direto. Com alvos, considerar favorável ATK do atacante maior que o valor de combate público do alvo, ou maior/igual quando `aggression > 0.5`; escolher a maior ameaça derrotável e ignorar alvos ocultos sem valor observável.
8. Se nenhuma categoria tiver seleção, devolver o `advance_phase` legal recebido de F03; se F03 retornou seu fallback discriminado, devolver esse fallback.
9. O agente mantém a pausa externa de 650 ms e o orquestrador reaplica a ação ao estado real. F04 não espera nem promove o `resultingState` especulativo.

### Regras de negócio

- A precedência entre categorias é absoluta; um score de ataque nunca ultrapassa uma invocação elegível.
- Maior ATK de monstro na mão é lido da carta referenciada por `handIndex`; empates usam menor `handIndex`, depois menor zona.
- Campo sem monstro adversário visível, mas com monstro oculto, **não** equivale a campo vazio. Ele não autoriza ataque direto e não oferece comparação de força.
- Para alvo em ataque, o valor da troca é seu ATK observável; para alvo em defesa, sua DEF observável. Alvo oculto não fornece valor.
- `aggression > 0.5` transforma comparação estrita `>` em `>=` apenas para ataques; não altera legalidade nem escolha de invocação.
- Magia/equipamento só é conhecida quando `getSpellEffect(numero)` retorna entrada. `place` sem entrada é inerte para esta política.
- Equipamento de bônus zero ou cuja classe não casa não é selecionado, embora possa ser legal para o motor.
- `playsSpells: false` bloqueia `equip_card`, `activate_spell`, `play_spell_or_trap` e `play_field_spell` na seleção.
- A política devolve uma ação existente no resultado de F03, salvo o fallback explícito já fornecido pelo próprio F03.

### Eventos

F04 não emite, consome ou resolve eventos. O `resultingState` de F03 pode conter janela pública, mas a política avalia somente o snapshot imediatamente resultante; apenas a aplicação real pelo orquestrador produz eventos efetivos.

### Determinismo e pureza

Todos os seletores são síncronos, puros e sem `Math.random()`, I/O, log, relógio ou mutação. Mesmos estado, parâmetros e candidatos legais na mesma ordem produzem a mesma ação. Cálculos derivados não sobrescrevem `Card.atk`/`def`; equipamentos geram deltas transitórios. Estado público, parâmetros, candidatos e `resultingState` permanecem imutáveis, em conformidade com `docs/arquitetura.md` §§1, 3.1 e 8, ADR-002 e ADR-008.

## 4. Contratos

### Tipos e schemas

Nenhum schema externo novo é criado. F04 reutiliza `DifficultyProfile`, `PublicDuelState`, `DuelAction`, `LegalCandidate` e `StrategyPolicy`. Os parâmetros são deliberadamente abertos no roster; o narrowing ocorre dentro da política, sem fechar `DifficultyProfile.parameters` em zod.

Contrato interno normalizado:

```text
FmBasicParameters = Readonly<{
  aggression: number;             // 0..1
  playsSpells: boolean;
  playsFieldSpells: boolean;
  defensiveThreshold: number;     // finito, >= 0
}>
```

### Funções públicas

```text
normalizeFmBasicParameters(parameters: DifficultyProfile["parameters"]): FmBasicParameters
```

Retorna sempre os quatro campos válidos, ignora chaves desconhecidas e não lança por tipo/faixa inválidos.

```text
selectFmBasicAction(input: {
  state: PublicDuelState;
  legalResult: LegalCandidateFilterResult;
  parameters: FmBasicParameters;
}): DuelAction
```

Pós-condições: a ação pertence aos candidatos legais ou é o fallback explícito de F03; entradas não são mutadas; desempate é estável.

```text
createFmBasicPolicy(dependencies: {
  generateCandidates: GenerateCandidates;
  filterLegalCandidates: FilterLegalCandidates;
  evaluateCandidate: EvaluateAiCandidate;
}): StrategyPolicy

createDefaultStrategyRegistry(dependencies: FmBasicPolicyDependencies): StrategyRegistry
```

`createFmBasicPolicy` encapsula a sequência F02 → F03 → seleção F04 e recebe a capability autorizada de F03 por injeção; não recebe `DuelState`. O registro padrão contém exatamente `passive` e `fm-basic`. A assinatura pública `AiAgent.decide(state, profile)` não muda.

Perfil com defaults explícitos:

```json
{
  "strategy": "fm-basic",
  "parameters": {
    "aggression": 0.5,
    "playsSpells": true,
    "playsFieldSpells": false,
    "defensiveThreshold": 0
  }
}
```

Exemplo de escolha ofensiva:

```json
{
  "type": "summon_monster",
  "player": "P2",
  "handIndex": 1,
  "zoneIndex": 0,
  "position": "attack_face_up"
}
```

Exemplo de escolha de equipamento:

```json
{
  "type": "equip_card",
  "handIndex": 2,
  "targetZone": { "player": "P2", "zoneType": "monster", "index": 0 }
}
```

### Contratos externos (cross-PRD)

- **F02/F03:** a política exige a visão original e o resultado de legalidade na ordem estável; não aceita lista crua não validada.
- **F01:** o registro padrão entrega a política criada por `createFmBasicPolicy` e o agente encaminha estado e parâmetros intactos.
- **Motor de Duelo 1x1:** cartas, posições, efeitos conhecidos e estados resultantes permanecem contratos autoritativos; F04 não redefine aplicação.
- **Free Duel/F01/F03/F09:** roster escolhe a string e o composition root usa o registro padrão. Nenhuma lógica específica de Teana/Jono entra na IA.

## 5. Modelo de Dados

F04 não cria Postgres, migração, RLS, IndexedDB, fila offline ou arquivo de dados. Parâmetros continuam no roster versionado existente e não ganham schema fechado. A tabela de efeitos existente em `packages/shared/src/duel/spell-effects/` é somente leitura.

As matrizes externas de Guardiões Estelares e terreno permanecem pendentes para cálculos completos. Enquanto não materializadas, seus modificadores são zero; a spec não inventa valores. Equipamentos conhecidos usam somente os bônus e filtros já presentes na tabela do projeto.

## 6. Tratamento de Erros e Casos de Borda

| Cenário | Detecção | Comportamento | Mensagem ao jogador |
|---------|----------|---------------|---------------------|
| Parâmetro ausente | Chave `undefined` | Usa default declarado no PRD. | Nenhuma. |
| Parâmetro com tipo/faixa inválido | Narrowing falha, número não finito ou fora do domínio | Usa default individual; demais parâmetros válidos permanecem. | Nenhuma. |
| Parâmetro desconhecido | Chave não reconhecida | Ignora sem log e sem alterar o perfil. | Nenhuma. |
| Nenhum candidato legal da categoria preferida | Partição vazia | Prossegue para a próxima categoria. | Nenhuma. |
| Apenas fallback de F03 | `legalResult.kind === "fallback"` | Devolve `advance_phase`. | Nenhuma. |
| Campo adversário vazio | Nenhuma zona ocupada | Prefere invocação ofensiva e permite ataque direto. | Jogada normal do NPC. |
| Apenas monstros adversários ocultos | Zonas ocupadas com carta invisível | Não lê stats, não declara direto e não afirma troca favorável. | NPC pode defender ou avançar. |
| Nenhuma troca favorável | Comparação falha para todos os alvos visíveis | Não ataca; tenta próxima categoria ou avança. | Nenhuma. |
| Magia sem entrada de efeito | `getSpellEffect` retorna `undefined` | Permanece na mão; candidato legal não é escolhido. | Nenhuma. |
| Magia conhecida com efeito público neutro | Utilidade resultante não melhora | Não escolhe efeito imediato; evita gastar ação sem ganho observável. | Nenhuma. |
| Equipamento incompatível | Filtro de classe falha | Não escolhe esse par carta/host. | Nenhuma. |
| `playsSpells: false` | Parâmetro normalizado falso | Ignora toda categoria de magia/equipamento/terreno. | Nenhuma. |
| `playsFieldSpells: false` | Parâmetro normalizado falso | Ignora terreno, preservando demais spells se habilitados. | Nenhuma. |
| Tabelas de guardião/terreno vazias | Providers neutros | Modificador zero; decisão segue dados observáveis restantes. | Nenhuma. |
| Empate completo entre candidatos | Tuplas iguais | Menor posição na lista legal vence. | Nenhuma. |
| Política recebe exceção/estado malformado | Fora da trajetória normal de F04 | F05 captura na fronteira e devolve `advance_phase`; F04 não mascara bug como score. | Partida continua após F05. |

## 7. Estratégia de Testes

### Unitários (Vitest)

- `normalizeFmBasicParameters aplica os quatro defaults para mapa vazio` — cobre valores do PRD.
- `normalizeFmBasicParameters preserva valores validos e ignora desconhecidos` — mantém contrato aberto.
- `normalizeFmBasicParameters substitui tipos faixas NaN e infinito invalidos` — cobre cada chave isoladamente.
- `selectSummon escolhe o monstro de maior ataque` — satisfaz critério de aceitação.
- `selectSummon usa ataque face_up contra campo vazio ou vantagem acima do threshold` — cobre fluxo ofensivo.
- `selectSummon usa defesa face_down quando nao vence a maior ameaca visivel` — cobre fluxo defensivo.
- `selectSpell ignora carta sem efeito conhecido` — mantém carta inerte na mão.
- `selectSpell playsSpells false bloqueia magia e equipamento` — cobre parâmetro explícito.
- `selectSpell equipa o monstro mais forte elegivel` — cobre filtro de classe e bônus positivo.
- `selectSpell playsFieldSpells controla terreno` — cobre habilitação sem inventar modificador.
- `selectPosition vira para ataque quando supera a maior ameaca` — cobre mudança ofensiva.
- `selectPosition vira para defesa quando nao vence e defesa supera ataque` — cobre mudança defensiva.
- `selectAttack declara direto quando o campo adversario esta vazio` — satisfaz critério do PRD.
- `selectAttack nao ataca quando nenhuma troca visivel e favoravel` — satisfaz critério do PRD.
- `selectAttack aggression acima de meio aceita empate` — fixa o limite do parâmetro.
- `selectFmBasicAction respeita a precedencia absoluta entre categorias` — cobre pipeline completo.

### Property-based (fast-check)

- `selectFmBasicAction sempre devolve candidato legal ou fallback de F03` — impede ação inventada.
- `selectFmBasicAction mesma entrada produz mesma acao` — prova determinismo sem PRNG.
- `selectFmBasicAction nao muta estado parametros candidatos ou resultados` — compara estruturas antes/depois.
- `normalizeFmBasicParameters sempre produz aggression entre zero e um e threshold nao negativo` — cobre valores arbitrários.
- `desempate completo escolhe sempre o menor indice de entrada` — protege estabilidade para F05.

### Integração

- `fm-basic pipeline recebe somente candidatos aprovados pelo motor` — integra F02/F03/F04 e reaplica a escolha sem recusa.
- `fm-basic tabela de efeitos diferencia magia conhecida de carta inerte` — usa cartas reais de Teana/Jono e a tabela compartilhada.
- `fm-basic equipamento respeita classe e bonus da tabela real` — integra helpers de efeito sem valores duplicados.
- `default strategy registry resolve passive e fm-basic` — completa o contrato de F01.
- `free duel roster strategy alterna comportamento sem mudanca de codigo` — troca apenas o profile do fixture.

### Análise estática

- `packages/ai` não importa apps, React, DOM, `fetch`, Supabase ou filesystem.
- A política não contém checagens de fase, zona livre, primeiro turno ou demais legalidades já do motor.
- Não há `Math.random`, timer, logger ou estado global mutável dentro de `fm-basic`.
- Nenhum cálculo sobrescreve `Card.atk` ou `Card.def`; modificadores permanecem derivados.

### Testes de aceitação (critérios do PRD)

| Critério (`docs/prds/ia-de-npcs.md` §9) | Teste |
|------------------------------------------|-------|
| Com dois monstros na mão, invoca o de maior ataque. | Fixture com ambos legalmente invocáveis afirma o `handIndex` do maior ATK. |
| Monstro superior ao maior ATK adversário visível entra em ataque face-up; caso contrário, defesa face-down. | Tabela cobre campo vazio, superior, empate e inferior. |
| Campo adversário vazio e monstro disponível produz ataque direto. | Estado de batalha com atacante legal compara a ação exata sem `targetZoneIndex`. |
| Nenhuma troca favorável implica não declarar ataque. | Todos os alvos visíveis superam/empatam sob agressividade padrão; resultado não é ataque. |
| Magia sem efeito na tabela permanece na mão. | Candidato legal `place` de carta inerte perde para avanço de fase. |
| `playsSpells: false` impede magia ou equipamento. | Propriedade filtra todos os quatro action types de spell da seleção. |

### Testes de integração cross-feature e cross-PRD

| Critério | Teste |
|----------|-------|
| F01 escolhe F04 somente sobre candidatos de F03 e o orquestrador aceita 100%. | Partida simulada afirma que cada ação escolhida pertence aos legais e reaplica com `Result.ok`. |
| Free Duel contra Teana e Jono chega ao resultado com CPU invocando e atacando. | Teste completo com pausa zero observa ao menos um `summon_monster`, um `declare_attack` e desfecho do motor. |
| Trocar `profile.strategy` muda o comportamento sem código. | Mesmo estado com `passive` devolve avanço e com `fm-basic` escolhe a melhor ação legal. |
| Desfecho continua exclusivo do motor. | Política nunca produz `surrender`, `outcome` ou mutação; apenas a sessão detecta o resultado de F12. |
