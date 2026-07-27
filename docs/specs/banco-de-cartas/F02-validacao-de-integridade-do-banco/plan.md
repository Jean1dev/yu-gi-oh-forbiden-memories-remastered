# Plano de Implementação — Validação de Integridade do Banco

> Spec: `./spec.md`

## Pré-requisitos

- **Depende de F01 (Ingestão e Normalização da Fonte)**, que já tem spec em
  `docs/specs/banco-de-cartas/F01-ingestao-e-normalizacao-da-fonte/`. F02 consome os artefatos
  `cards.json` e `arts-manifest.json` que F01 produz — a implementação desta feature assume que
  F01 já roda e emite esses dois arquivos em `packages/data/generated/`.
- **Nenhum contrato externo cross-PRD é consumido.** F02 depende só de F01, mesma PRD.
- **Nenhuma tabela de dado externo pendente (F05–F08) é tocada.**
- **Decisão a confirmar com o usuário antes de codar (já resolvida na entrevista):** `ritual` é
  excluído da exigência de `atk`/`def`/guardiões preenchidos, substituindo o critério de aceite 3
  do PRD §9 F02. Registrado como Decisão 1 na spec.
- **Pendência de asset:** o arquivo de imagem de placeholder ainda não existe no repositório. O
  caminho é fixado como contrato (`CAMINHO_PLACEHOLDER_ARTE_PADRAO`) para F04 herdar depois; a
  checagem de cobertura de arte que depende dele não dispara hoje porque o dataset real tem 722
  cartas ↔ 722 artes (0 ausências verificadas por F01).

## Fase 1: Contratos de relatório e selo em `packages/shared`

**1. Constantes de classes conhecidas e caminho do placeholder** — Acrescentar ao vocabulário
canônico de carta a lista fixa das 24 classes verificadas na origem e o caminho contratado do
placeholder padrão de arte, que F02 usa agora e F04 herdará.

**2. Tipos e schemas de relatório e selo de validação** — Declarar os tipos e os schemas zod da
violação de validação, do relatório de integridade e do selo válido/inválido, incluindo o schema
que F03 usará para parsear o selo com segurança.

## Fase 2: Núcleo puro de validação em `packages/data`

**3. Reparse defensivo do dataset canônico** — Implementar a revalidação de cada carta do
`cards.json` bruto contra o schema canônico, sem confiar no relatório de F01 e sem abortar no
primeiro registro inválido, produzindo uma violação por registro que falhar.

**4. Checagem de contagem e contiguidade** — Implementar a verificação de que o conjunto
reparseado tem exatamente 722 cartas com `numero` 001–722 contíguo, reportando o total encontrado
e cada lacuna.

**5. Checagem de unicidade** — Implementar a detecção de `numero` duplicado entre registros
reparseados com sucesso, citando os dois registros envolvidos.

**6. Checagem de classe conhecida** — Implementar a verificação de cada `classe` contra o
conjunto fixo de classes conhecidas, reportando toda classe fora dele.

**7. Checagem de coerência por tipo** — Implementar a verificação simétrica: `monstro` exige
`atk`/`def`/guardiões preenchidos; qualquer outro tipo, incluindo `ritual`, exige esses campos
vazios.

**8. Checagem de cobertura de arte** — Implementar a verificação de que toda carta reparseada
tem entrada no manifesto de artes ou, na ausência dela, que o placeholder padrão existe de fato no
disco.

**9. Montagem do relatório e decisão do selo** — Implementar a agregação de todas as violações
das checagens anteriores em um relatório único, com contagem por categoria, lista de classes
desconhecidas e o veredito final, e a derivação do selo minimalista a partir desse veredito.

**10. Orquestrador puro de validação** — Compor o reparse e as quatro checagens de conjunto numa
única função que recebe os dados já lidos e o resultado da verificação do placeholder, e devolve
o relatório e o selo, sem tocar em filesystem.

## Fase 3: Adaptador de I/O e integração no build

**11. Script de validação** — Implementar o adaptador de linha de comando que lê os artefatos de
F01, verifica a existência do placeholder no disco, chama o núcleo puro, grava o relatório e o
selo, imprime o resumo exigido pela Experience do PRD e define o código de saída conforme o
veredito.

**12. Integração no grafo de build do Turborepo** — Registrar a validação como tarefa que depende
da tarefa de ingestão de F01, com entradas e saídas declaradas para aproveitar cache e garantir
que nenhum ambiente sirva um dataset que não passou por este portão.

**13. Verificação de fronteira de pacote** — Estender a análise estática de F01 para cobrir
também o novo subsistema de validação, garantindo que ele não importe APIs de I/O nem pacotes
acima de `data` na direção de dependências.

**14. Verificação de aceite contra a fonte real** — Executar a validação sobre a saída real da
ingestão de F01 e confrontar o resultado com os critérios de aceite do PRD (com a correção da
Decisão 1) e com os números verificados na spec: seleção do selo válido, contagem por categoria
zerada, e os cenários de adulteração manual usados nos testes de integração.
