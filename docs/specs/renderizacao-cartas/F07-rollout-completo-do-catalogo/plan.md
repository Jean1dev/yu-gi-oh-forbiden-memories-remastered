# Plano de Implementação — Rollout Completo do Catálogo

## Pré-requisitos

- `renderizacao-cartas/F02`, F03 e F06 implementadas e validadas na branch atual.
- Acesso de rede à API e ao CDN do YGOPRODeck durante a execução real.
- Revisão manual dos overrides deve usar somente equivalências confirmadas; nenhuma pendência pode receber
  metadado inventado.
- Antes da aplicação destrutiva, o repositório deve estar recuperável pelo Git e o relatório em modo de
  simulação deve estar verde.

## Fase 1 — Escala e contrato de cobertura

**1. Seleção do catálogo completo** — Estender os entrypoints de enriquecimento e download para selecionar
as 722 cartas canônicas com uma opção explícita, mantendo o piloto como comportamento padrão.

**2. Classificação de cobertura** — Implementar o verificador puro que cruza enriquecimento, arte crop e
imagem completa legada, produzindo estados e totais determinísticos conforme a spec.

**3. Validação do pipeline** — Cobrir a seleção completa, a matriz de classificação e a autorização de
remoção com testes, typecheck, lint e portões do pacote de dados.

## Fase 2 — Comando seguro de rollout

**4. Relatório operacional** — Criar o comando que carrega os dados reais, valida as artes e grava o
relatório de cobertura antes de qualquer alteração destrutiva.

**5. Simulação e aplicação** — Entregar o modo de simulação padrão e a aplicação explícita que remove
somente imagens antigas elegíveis, preservando todos os fallbacks pendentes.

**6. Cobertura combinada na ingestão** — Ajustar a validação do catálogo e seus testes para aceitar a
coexistência de CardFrame migrado e fallback legado sem permitir carta descoberta.

## Fase 3 — Execução sobre as 722 cartas

**7. Enriquecimento completo** — Executar o pipeline de F02 sobre o catálogo, revisar o relatório, adicionar
somente overrides confirmados e repetir até separar correspondências válidas de pendências explícitas.

**8. Download completo** — Executar o pipeline de F03 para todas as URLs resolvidas, mantendo no relatório
qualquer falha de rede, formato ou resolução.

**9. Ingestão e simulação** — Regenerar os artefatos, executar o relatório em dry-run e corrigir qualquer
estado inconsistente ou descoberto antes de autorizar exclusões.

## Fase 4 — Aposentadoria seletiva e verificação final

**10. Aplicação das remoções** — Aplicar a lista exata de imagens completas elegíveis produzida pelo
relatório verde, mantendo no repositório os JPEGs das cartas pendentes.

**11. Regeneração pós-rollout** — Rodar novamente ingestão e cobertura para confirmar 722 cartas
renderizáveis, manifestos coerentes e nenhuma exclusão indevida.

**12. Validação final** — Executar lint, typecheck, testes e build do monorepo, rechecando os critérios de
aceite e os portões de arquitetura antes do commit final da fase.
