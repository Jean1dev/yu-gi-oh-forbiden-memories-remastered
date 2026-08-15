---
name: duelist-builder
description: Pesquisa, documenta e adiciona um duelista de Yu-Gi-Oh! Forbidden Memories ao roster do Remastered, incluindo retrato próprio gerado em pixel art de PS1, pool original, deck canônico determinístico, drops, perfil de IA, validação, partida real e commit. Use quando o usuário pedir para adicionar/incluir/criar um personagem ou duelista do FM, portar um NPC, montar o deck de um personagem, gerar seu retrato, ou preparar Teana/Jono/Seto/Mai e outros oponentes para o Free Duel.
---

# Duelist Builder

Adicionar um duelista por dados. Não escrever lógica específica do personagem quando uma política
existente comportar seu estilo.

## Entrada

Obter o nome/versão exata do duelista no FM e, opcionalmente, a dificuldade desejada. Desambiguar
versões como `Seto`, `Seto 2nd` e `Seto 3rd` antes de extrair.

## Fluxo

1. Verificar o estado do worktree e ler `AGENTS.md`, `docs/duelistas/README.md`, os duelistas já
   documentados e a API pública de `packages/ai`.
2. Usar `sg4e/YGOFM-gamedata` como fonte primária. O dump SQLite fica em
   `https://raw.githubusercontent.com/sg4e/YGOFM-gamedata/master/sqlite/fm-sqlite3.db`; o script
   `packages/data/scripts/extract-fm-duelist.ts` baixa/cacheia e consulta o arquivo com Node 24.
   Usar Fandom/Yugipedia/GameFAQs apenas para contexto comportamental e registrar quando o fetch
   automatizado estiver bloqueado.
3. Resolver o nome/versão para o `fmDuelistId`. Executar o script de extração conforme os argumentos
   expostos em `packages/data/package.json`/no próprio script. Nunca inventar pools ou pesos.
4. Gerar o retrato próprio com o skill `imagegen`, usando o modo built-in. Consultar referências
   visuais do personagem no jogo original e registrar os links, sem commitar as referências.
   Gerar **duas variantes** com a mesma direção: busto central seguro para corte 4:3, pixel art de
   PS1, fundo opaco coerente com o personagem, sem texto, logo, marca-d'água, cartas ou personagens
   extras. Usar no prompt os traços reconhecíveis do personagem e o contexto do cenário.
5. Inspecionar as duas variantes. Escolher autonomamente a que melhor preservar identidade,
   silhueta, anatomia, leitura em miniatura e margem de corte. Rejeitar arte com texto, artefatos,
   enquadramento cortado ou aparência de carta/monstro quando o alvo for humano. Se nenhuma passar,
   fazer uma nova tentativa focada no defeito; se ainda falhar, abortar antes do build e do commit.
6. Copiar somente a variante escolhida para `apps/web/public/duelists/<id>.png` e declarar
   `portrait: "duelists/<id>.png"`. Nunca deixar um asset referenciado apenas no diretório de saída
   do gerador. Não sobrescrever retrato existente sem pedido explícito; numa atualização aprovada,
   substituir o arquivo canônico no mesmo commit.
7. Revisar `packages/data/data/duelists/<id>.json`: identidade, dificuldade, retrato, `deckSeed`,
   pool de deck e pools de drop. O algoritmo canônico limita o deck a 40 cartas e 3 cópias; manter
   uma seed fixa documentada.
8. Criar `docs/duelistas/<id>.md` seguindo os documentos existentes: identidade, retrato, fonte,
   pool ponderado/2048, deck derivado, drops, estilo observado e perfil de IA. Na seção `Retrato`,
   registrar que a arte foi gerada, a descrição específica do prompt, as referências consultadas e
   a validação aplicada; não registrar caminhos temporários ou variantes descartadas.
9. Escolher uma estratégia já registrada em `packages/ai`. Preferir `fm-basic` para oponentes que
   invocam o melhor monstro, defendem em desvantagem e atacam trocas favoráveis. Calibrar somente
   parâmetros existentes e justificar cada diferença no documento.
10. Se o comportamento exigir política nova, parar antes de codar e usar `duel-feature-prd` →
   `spec-writer` → `implement-feature`. Política nova é comportamento novo, não edição de dados.
11. Executar `pnpm --filter @yugioh/data data:build-roster` e
   `pnpm --filter @yugioh/data roster:validate`. Confirmar que nenhum duelista existente sumiu ou
   foi ocultado.
12. Executar o teste de integração de retratos da aplicação web. Confirmar que todo duelista real,
    exceto a fixture `test-duelist`, aponta para `duelists/<id>.png` e que o arquivo existe em
    `apps/web/public`; carregar a seleção de oponente e confirmar que o retrato não caiu no fallback.
13. Adicionar/ajustar testes de integração do roster e uma partida com motor real, seed fixa e pausa
   zero. Confirmar: início válido, nenhuma ação da CPU recusada, ao menos uma invocação e um ataque
   quando o deck/partida permitirem, retorno ao jogador antes de 100 ações e desfecho exclusivo do
   motor.
14. Rodar `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm test:integration` e `pnpm build`. Classificar falhas realmente
    preexistentes sem mascarar regressões.
15. Commitar o PNG escolhido junto dos dados, documentação e testes como
    `Adiciona duelista <Nome>, free-duel/F01`. Adicionar duelista com política existente deve ser um
    único commit de asset/dados/documentação/testes.

## Regras duras

- Não alterar `packages/data/data/roster.json` manualmente; ele é saída de `data:build-roster`.
- Não usar `Math.random()` nem tornar o deck variável em runtime. Preservar seed e diff reproduzível.
- Não pesquisar uma lista de deck pronta e tratá-la como autoridade: o FM sorteia do pool ponderado;
  o projeto deriva um deck canônico fixo desse pool.
- Não expor mão/deck ocultos à IA e não duplicar legalidade do motor.
- Não usar arte de carta, URL remota ou placeholder como retrato de um duelista real. O fallback da
  UI existe apenas para falha de runtime; ausência do PNG é entrega incompleta.
- Não commitar referências visuais, variantes descartadas ou arquivos deixados no diretório de
  saída do gerador. Commitar apenas `apps/web/public/duelists/<id>.png`.
- Não sobrescrever fontes ou mudanças de outros duelistas.

## Entrega

Reportar fonte e `fmDuelistId`, seed, composição de 40 cartas, estratégia/parâmetros, caminho do
retrato, prompt final, referências visuais, critérios da inspeção, arquivos criados, testes
executados, critérios observados na partida e hash do commit.
