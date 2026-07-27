# Plano de Implementação — Ingestão e Normalização da Fonte

> Spec: `./spec.md`

## Pré-requisitos

- **O monorepo ainda não existe.** Esta é a primeira feature com código no repositório, então o
  scaffolding mínimo (pnpm workspaces, Turborepo, TypeScript strict, Node.js 24 LTS) faz parte
  da Fase 1. Nenhuma dependência interna precede F01 — `Dependências: None` na tabela do PRD §8.
- **Nenhum contrato externo cross-PRD é consumido.** O Banco de Cartas é fornecedor; Library,
  Build Deck, Motor, Password e Online Duel são consumidores de saída.
- **Nenhuma tabela de dado externo pendente é tocada.** Fusões, guardiões, terreno e drops
  (F05–F08) estão fora desta feature.
- **A origem é dado real já presente no repositório:** 821 JSONs em `cards-data/dados/` e 722
  JPGs em `cards-data/`. Não é preciso obter nada de fora.
- **Decisão a confirmar antes de F02 (não bloqueia F01):** o critério do PRD que exige `atk`,
  `def` e guardiões preenchidos para `ritual` reprova o dataset real — os 24 rituais têm esses
  quatro campos vazios na origem. Registrado como Decisão 13 na spec e como pendência em
  `docs/arquitetura.md` §10.
- **Consequência da escolha de não versionar os artefatos:** `packages/data/generated/` fica no
  `.gitignore`, então a ingestão passa a ser passo obrigatório de todo ambiente. A Fase 3 amarra
  isso no grafo de tarefas do Turborepo.

## Fase 1: Contratos canônicos em `packages/shared`

**1. Scaffolding do monorepo** — Criar a raiz do workspace com pnpm workspaces e Turborepo, o
baseline strict de TypeScript e a fixação de Node.js 24 LTS nos arquivos de tooling. É o piso
sobre o qual todos os pacotes seguintes são criados.

**2. Primitivos de resultado e erro** — Criar em `shared` o tipo de resultado discriminado e a
classe de erro de domínio com código e detalhes, que toda função de fronteira desta feature usa
para reportar falha sem lançar exceção silenciosa.

**3. Vocabulário canônico de carta** — Declarar em `shared` os tipos e as constantes do domínio:
os cinco tipos de carta, os dez guardiões estelares, o formato do número de carta e a contagem
canônica total. Esses valores passam a ser a fonte única para todo o monorepo.

**4. Schema de validação da carta canônica** — Definir em `shared` o schema zod que descreve os
doze campos da carta já normalizada, com as regras de tipo, faixa e formato descritas na spec. É
o contrato que F02, F03 e todos os módulos cross-PRD vão consumir.

## Fase 2: Núcleo puro de ingestão em `packages/data`

**5. Schema do envelope de origem** — Criar o pacote `data` e nele os schemas que descrevem a
forma bruta dos arquivos de entrada: o envelope com discriminação por sucesso e o registro de
carta com todos os campos como strings. Existem apenas para dar erro explícito na fronteira e
não vazam do subsistema de ingestão.

**6. Normalização de registro único** — Implementar a transformação de um registro bruto em carta
canônica, cobrindo a coerção dos campos numéricos, a resolução das sentinelas de ausência, a
preservação literal de nome, classe e tipo, e a conferência do número contra o nome do arquivo.
Cada falha devolve o código que identifica o campo culpado.

**7. Agregação, desambiguação e detecção de lacunas** — Implementar o agrupamento dos registros
sobreviventes por número, o aborto explícito em colisão entre dois registros válidos, a ordenação
crescente do dataset e o levantamento dos números ausentes no intervalo varrido.

**8. Manifesto de artes** — Implementar o cruzamento entre as cartas emitidas e os arquivos de
arte disponíveis, separando as artes resolvidas, as cartas sem arte e as artes sem carta. O
manifesto contém apenas o que existe; o fallback é responsabilidade de F04.

**9. Relatório de ingestão** — Implementar a montagem da evidência de processo que F02 e o
mantenedor consomem, incluindo as contagens, as listas de descarte e as classes observadas
derivadas do dataset, além do veredito de completude.

**10. Orquestrador puro da ingestão** — Compor os passos anteriores numa única função que recebe
os conteúdos já lidos e devolve dataset, manifesto e relatório, sem tocar em filesystem. É o
ponto onde a garantia de independência da ordem de entrada é estabelecida.

**11. Serialização determinística** — Implementar a emissão dos artefatos em JSON com ordenação
estável, ordem de chaves fixa e formatação previsível, de modo que a mesma origem produza sempre
os mesmos bytes e o hash de F10 tenha significado.

## Fase 3: Adaptador de I/O e integração no build

**12. Script de ingestão** — Implementar o adaptador de linha de comando que resolve os
diretórios de origem, artes e saída, verifica a existência da fonte antes de qualquer escrita,
chama o núcleo puro, grava os três artefatos, imprime o resumo legível exigido pela Experience do
PRD e define o código de saída conforme a completude.

**13. Integração no grafo de build e no controle de versão** — Registrar a ingestão como tarefa
do Turborepo com entradas e saídas declaradas para aproveitar cache, torná-la dependência das
tarefas de build, teste e verificação de tipos, e excluir o diretório de artefatos do controle de
versão.

**14. Verificação de fronteira de pacote** — Configurar a análise estática que impede o núcleo de
ingestão de importar APIs de I/O e impede `data` de importar qualquer pacote acima dele na
direção de dependências, sustentando o pilar de fronteiras explícitas da arquitetura.

**15. Verificação de aceite contra a fonte real** — Executar a ingestão sobre os arquivos reais e
confrontar o resultado com os critérios de aceite do PRD e com os números verificados na spec:
total emitido, contiguidade, distribuição por tipo, conjunto de classes e guardiões, paridade de
artes e estabilidade dos bytes entre execuções.
