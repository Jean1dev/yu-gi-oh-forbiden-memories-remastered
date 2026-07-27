# Template — spec.md e plan.md

Dois arquivos por feature, ambos em Português, salvos em
`docs/specs/<prd-slug>/<FXX>-<kebab-name>/`.

Os blocos `[...]` são instruções de preenchimento — remova-os do documento final.
Nenhum dos dois arquivos leva cabeçalho de ID, data ou versão.

---

## Template de `spec.md`

````markdown
# <Nome da Feature>

> PRD: `docs/prds/<prd-slug>.md` — F<ID>
> Pacote-alvo: `packages/<x>` [+ `apps/<y>`]

## 1. Contexto e Escopo

[1-2 parágrafos: o que esta feature entrega tecnicamente e como se encaixa no módulo e no
roadmap de `docs/arquitetura.md` §9.]

### Incluído
- [Capacidade concreta 1 — rastreável a Core Scope / Capabilities do PRD]
- [Capacidade concreta 2]

### Adiado
- [Item de Full Scope additions fora desta spec, quando o usuário escolheu só Core. Omitir a
  subseção se não houver nada adiado.]

### Fronteiras
- [O que pertence a outro módulo/PRD, citando a Seção 7 do PRD. Ex.: "tabela de drops é do
  módulo de duelo (cross-PRD); esta feature só recebe a carta já escolhida".]

### Contratos externos assumidos
- [`Módulo/FXX` ou subsistema ainda inexistente do qual esta feature depende, com a interface
  esperada resumida. Omitir se não houver.]

### Decisões e Premissas
| # | Decisão / Premissa | Origem | Status |
|---|--------------------|--------|--------|
| 1 | [decisão tomada] | [entrevista / `arquitetura.md` §X / ADR-00N / guidelines §Y / auto-aceite: <linha da política>] | confirmada \| a confirmar |
| 2 | [pendência de dado externo tratada com fallback neutro] | Fase 0.4 | pendente — aguarda dado |

## 2. Alocação no Monorepo

| Arquivo | Pacote | Novo/Alterado | Responsabilidade |
|---------|--------|---------------|------------------|
| `packages/shared/src/<...>.ts` | shared | novo | [schemas zod / tipos] |
| `packages/<x>/src/<...>.ts` | <x> | novo | [...] |
| `apps/web/app/<...>/page.tsx` | web | novo | [...] |

**Verificação da direção de dependências:** [declare quais pacotes esta feature importa e
confirme que respeita `shared ← data ← rules ← engine ← ai`. Se toca `engine`, afirme
explicitamente: nenhum import de React/DOM/`fetch`/Supabase.]

## 3. Design Técnico

### Estruturas de dados
[Formato das estruturas em memória/estado, com campos e semântica. Descrição e assinaturas —
não implementação.]

### Fluxo
[Passo a passo do comportamento, derivado de Capabilities + Experience do PRD. Numere os
passos e inclua os limites concretos: 40 cartas, máx. 3 cópias, 8000 LP, ≤200ms, etc.]

### Regras de negócio
[Regras e validações específicas, com números. Marque as que vêm de invariantes da Fase 0.3.]

### Eventos
[Eventos emitidos/consumidos quando a feature toca o motor ou o Effect System: `onSummon`,
`onAttackDeclared`, etc., com ordem de emissão e quem resolve.]

### Determinismo e pureza
[Obrigatório quando toca `packages/engine`: PRNG semeado dentro do estado, sem `Math.random()`,
estado JSON serializável, modificadores sem mutar `atk`/`def` base. Omitir fora do engine.]

## 4. Contratos

### Tipos e schemas (`packages/shared`)
[Nome e forma dos schemas zod / tipos exportados, campo a campo.]

### Funções públicas
```
nomeDaFuncao(entrada: Tipo): Saida   // contrato, pré-condições, pós-condições
```

### Endpoints / RPC / mensagens de rede
[Método, caminho ou nome da RPC, payload de entrada e saída, códigos de erro. Com exemplos JSON.]

```json
{ "exemplo": "de payload" }
```

### Contratos externos (cross-PRD)
[Interface que esta feature espera de um módulo ainda não implementado, marcada como "a ser
fornecida por <Módulo>".]

[Seção omissível em features triviais/simples sem contrato novo.]

## 5. Modelo de Dados

### Postgres / Supabase
| Tabela | Colunas | Tipo | Constraints / Índices |
|--------|---------|------|------------------------|

**RLS:** [política por jogador.]
**Migração:** [o que a migração cria/altera.]
**Atomicidade e idempotência:** [obrigatório para economia: RPC transacional, chave única de
idempotência, nenhum valor sensível vindo do cliente.]

### Cache local / fila offline
[Stores IndexedDB, chaves, `idempotencyKey`, política de sync.]

### Arquivos de dados versionados
[Formato do bundle, `version` + `hash`, comportamento com tabela vazia.]

[Seção omissível em features triviais/simples sem dado novo.]

## 6. Tratamento de Erros e Casos de Borda

| Cenário | Detecção | Comportamento | Mensagem ao jogador |
|---------|----------|---------------|---------------------|

[Cubra o bloco Error Handling do PRD + falhas técnicas: dado inválido na fronteira (zod),
rede/desconexão, conflito de versão/hash do dataset, fila offline, concorrência entre
dispositivos, tabela pendente vazia.]

## 7. Estratégia de Testes

### Unitários (Vitest)
- `nomeDoCaso` — [o que verifica]

### Property-based (fast-check)
[Obrigatório quando há determinismo ou round-trip. Ex.: mesmo seed + mesma sequência ⇒ estado
final idêntico em 1.000 execuções; `deserialize(serialize(s)) == s`.]

### Integração
- [Casos que atravessam pacotes ou tocam Postgres/RLS/RPC.]

### Análise estática
- [Ex.: `engine` sem imports de UI/I/O — pilar 1 de `arquitetura.md`.]

### Testes de aceitação (critérios do PRD)
| Critério (Seção 9 do PRD) | Teste |
|---------------------------|-------|

### Testes de integração cross-feature e cross-PRD
| Critério | Teste |
|----------|-------|
````

---

## Template de `plan.md`

````markdown
# Plano de Implementação — <Nome da Feature>

> Spec: `./spec.md`

## Pré-requisitos
- [Dependência interna já implementada / spec existente]
- [Contrato externo cross-PRD assumido]
- [Pendência de dado externo e o fallback neutro adotado enquanto ela não chega]
- [Decisão em aberto a confirmar antes de codar, quando houver]

## Fase 1: <Nome da fase>

**1. <Componente>** — [Parágrafo de alto nível, 1-3 frases, dizendo O QUE fazer. Referencie a
spec para o COMO. Sem tipos, colunas, assinaturas ou nomes de método.]

**2. <Componente>** — [...]

## Fase 2: <Nome da fase>

**3. <Componente>** — [...]

[1-5 fases conforme a complexidade: trivial 1-2 fases/2-4 passos; simples 2-3/5-8;
média 3-4/10-15; complexa 4-5/15-25. Numeração dos passos é contínua entre as fases.]
````

---

## Lembretes

- **Nunca** código real na spec — estruturas, assinaturas e contratos.
- **Nunca** decisão de arquitetura no plan — ela vive na spec.
- **Nunca** estimativa de tempo, fase de testes dedicada, ou cabeçalho de ID/data/versão.
- **Nunca** valores inventados de guardiões, terrenos, fusões, drops, rating ou balanceamento.
- Sempre cite `docs/arquitetura.md §X` e `ADR-00N` quando a decisão vier deles.
