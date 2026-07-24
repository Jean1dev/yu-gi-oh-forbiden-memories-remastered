# TypeScript Development Guidelines
## Project Stack
This project guideline targets TypeScript on Node.js 24 LTS.
User-specified libraries:
- None. The stack below is auto-selected from the project ADRs and TypeScript ecosystem defaults.
Auto-populated essential tools:
- Runtime: Node.js 24 LTS, latest LTS observed v24.18.0 - stable runtime for local, CI, scripts, and online server - https://nodejs.org
- Language: TypeScript v6.0.3 - compiler and static type checker - https://www.typescriptlang.org
- Node types: @types/node v24.10.0 - Node.js 24 type declarations - https://github.com/DefinitelyTyped/DefinitelyTyped
- Package manager: pnpm v11.17.0 - fast package manager with workspace support - https://pnpm.io
- Testing: Vitest v4.1.10 - Vite-powered test runner for TypeScript projects - https://vitest.dev
- Formatting: Prettier v3.9.6 - opinionated formatter for TypeScript and related files - https://prettier.io
- Linting: ESLint v10.7.0 + typescript-eslint v8.65.0 - static analysis for JavaScript and TypeScript - https://eslint.org and https://typescript-eslint.io
- Logging: Pino v10.3.1 - structured JSON logger for Node.js - https://getpino.io
Compatibility note:
- npm latest showed `typescript@7.0.2`, but `typescript-eslint@8.65.0` supports `typescript >=4.8.4 <6.1.0`.
- Use `typescript@6.0.3` until the lint toolchain officially supports TypeScript 7.
- All code examples below use TypeScript, ECMAScript, or Node.js built-ins only.
- Frameworks, ORMs, and project libraries belong in application code, not in this language guideline.
## 1. Core Principles
### 1.1 Philosophy and Style
- Use TypeScript as a correctness tool, not as decoration over JavaScript.
- Enable `strict` and keep it enabled.
- Prefer small modules with one reason to change.
- Prefer explicit data shapes over loosely typed bags of fields.
- Use automatic formatting; style debates belong in Prettier config.
- Use linting for correctness, maintainability, and clean-code rules.
- Make invalid states hard to represent.
- Keep domain logic separate from I/O, UI, persistence, and transport.
### 1.2 Clean Code Rules
- Functions should do one thing and expose intent through names.
- Names must communicate domain meaning, not implementation trivia.
- Avoid clever expressions when an ordinary branch is clearer.
- Avoid deep nesting through early returns and guard clauses.
- Avoid hidden side effects; mutate only at clear boundaries.
- Keep public APIs small and stable.
- Keep data immutable by default.
- Remove dead code instead of leaving comments around it.
### 1.3 Clarity over Brevity
Good:
```ts
const hasEnoughStars = player.stars >= card.cost;
if (!hasEnoughStars) {
  return { ok: false, reason: "insufficient_stars" };
}
```
Bad:
```ts
if (!(p.s < c.c)) return { ok: true };
```
Rules:
- Clear names are cheaper than explanations.
- Prefer obvious control flow over compressed expressions.
- Optimize after measurement, not before.
- A clean implementation is easy to test without special setup.
- A clean module exports concepts, not internals.
## 2. Project Initialization
### 2.1 Creating New Project
Use Node.js 24 LTS and Corepack.
```bash
node --version
corepack enable
corepack prepare pnpm@11.17.0 --activate
pnpm --version
```
Initialize a TypeScript package.
```bash
pnpm init
pnpm add -D typescript@6.0.3 @types/node@24.10.0
pnpm exec tsc --init
```
Recommended `package.json` baseline:
```json
{
  "type": "module",
  "engines": {
    "node": "24.x",
    "pnpm": "11.x"
  },
  "packageManager": "pnpm@11.17.0",
  "scripts": {
    "typecheck": "tsc --noEmit",
    "test": "node --test",
    "format": "prettier . --write",
    "lint": "eslint ."
  }
}
```
### 2.2 Dependency Management
Use exact intent in dependency commands.
```bash
pnpm add zod
pnpm add -D vitest prettier eslint typescript-eslint
pnpm remove zod
pnpm update --interactive
pnpm outdated
pnpm audit
```
Guidance:
- Put runtime dependencies in `dependencies`.
- Put tools, test helpers, and type packages in `devDependencies`.
- Use `pnpm-lock.yaml` as a committed artifact.
- Do not mix lockfiles from npm, Yarn, Bun, and pnpm.
- Use `workspace:` protocol for internal packages in a monorepo.
## 3. Project Structure
### 3.1 Standard Layout
Use boring structure until the code proves it needs more.
```text
.
├── apps/
│   ├── web/
│   └── server/
├── packages/
│   ├── shared/
│   ├── data/
│   ├── rules/
│   ├── engine/
│   └── ai/
├── docs/
├── scripts/
├── tests/
├── package.json
├── pnpm-workspace.yaml
├── tsconfig.json
├── eslint.config.mjs
└── prettier.config.mjs
```
### 3.2 Package Boundaries
- `shared`: types, schemas, and contracts only.
- `data`: build-time ingestion and runtime read-only catalog.
- `rules`: pure rule helpers and data-driven effects.
- `engine`: deterministic state transitions, no UI or I/O.
- `ai`: decision logic consuming public duel state.
- `web`: rendering and user interaction.
- `server`: online authority, transport, and session lifecycle.
### 3.3 Import Direction
Allowed direction:
```text
shared <- data <- rules <- engine <- ai
                              ^
                         web/server
```
Rules:
- Lower-level packages never import apps.
- `engine` never imports React, DOM, Supabase, fetch, filesystem, or WebSocket.
- I/O adapters call pure domain modules; pure modules do not call adapters.
- Cross-package contracts live in `shared`, not duplicated in apps.
- Tests may import fixtures, but production code must not import from `tests`.
## 4. Container Development
### 4.1 Container Philosophy
Use containers when local parity matters.
- Pin Node.js 24 LTS in the image.
- Keep development containers simple.
- Mount the source tree for fast iteration.
- Keep `node_modules` isolated in a named volume.
- Run the same commands in local and CI.
### 4.2 Docker File Structure
```text
.
├── Dockerfile
├── docker-compose.yaml
└── .dockerignore
```
### 4.3 Dockerfile for Development
Use a development image, not a production build.
```dockerfile
FROM node:24.18.0-alpine
WORKDIR /workspace
RUN corepack enable
COPY package.json pnpm-lock.yaml* pnpm-workspace.yaml* ./
CMD ["sleep", "infinity"]
```
### 4.4 Docker Compose
```yaml
services:
  app:
    build:
      context: .
      dockerfile: Dockerfile
    working_dir: /workspace
    volumes:
      - .:/workspace
      - node_modules:/workspace/node_modules
      - pnpm_store:/root/.local/share/pnpm/store
    command: sleep infinity
    environment:
      NODE_ENV: development
    healthcheck:
      test: ["CMD", "node", "--version"]
      interval: 30s
      timeout: 5s
      retries: 3
volumes:
  node_modules:
  pnpm_store:
```
### 4.5 .dockerignore
```gitignore
node_modules
.turbo
dist
coverage
.next
.env
.env.*
npm-debug.log
pnpm-debug.log
```
### 4.6 Essential Commands
```bash
docker compose up -d
docker compose logs -f app
docker compose exec app pnpm install
docker compose exec app pnpm typecheck
docker compose exec app pnpm test
docker compose exec app sh
docker compose down
```
Best practices:
- Do not bake local secrets into images.
- Do not copy `.env` into images.
- Prefer one container process for development.
- Use healthchecks for external dependencies.
- Keep production Dockerfiles separate from development containers.
## 5. Naming Conventions
### 5.1 Files and Modules
- Use `kebab-case.ts` for ordinary files.
- Use `PascalCase.tsx` only for React component files when the project uses that convention.
- Use `*.test.ts` for unit tests.
- Use `*.integration.test.ts` for integration tests.
- Use `index.ts` only for stable public package exports.
- Avoid barrel files that hide large dependency graphs.
### 5.2 Types, Values, and Functions
```ts
type CardNumber = string;
interface DuelRepository {
  save(snapshot: DuelSnapshot): Promise<void>;
}
const MAX_DECK_SIZE = 40;
function canStartDuel(deckSize: number): boolean {
  return deckSize === MAX_DECK_SIZE;
}
```
Rules:
- `PascalCase` for types, interfaces, classes, and enums.
- `camelCase` for variables, functions, methods, and object properties.
- `SCREAMING_SNAKE_CASE` only for exported constants that are true constants.
- Prefix booleans with meaning: `is`, `has`, `can`, `should`.
- Prefer `cardNumber` over `num`.
### 5.3 Domain Naming
Good:
```ts
type DuelId = string;
type PlayerId = string;
function drawUntilHandIsFull(player: PlayerState): PlayerState {
  return player;
}
```
Bad:
```ts
function doStuff(p: any): any {
  return p;
}
```
Rules:
- Domain terms should match product vocabulary.
- Do not shorten names unless the abbreviation is universal.
- Prefer `duelId` over `id` outside tiny scopes.
- Use named objects when functions need more than 3 or 4 parameters.
## 6. Types and Type System
### 6.1 Compiler Baseline
Use strict settings.
```json
{
  "compilerOptions": {
    "target": "ES2024",
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "exactOptionalPropertyTypes": true,
    "noImplicitOverride": true,
    "noFallthroughCasesInSwitch": true,
    "noEmit": true
  },
  "include": ["apps/**/*.ts", "packages/**/*.ts", "scripts/**/*.ts"]
}
```
### 6.2 Type Declaration
Prefer precise unions over generic strings.
```ts
type CardType = "monster" | "magic" | "trap" | "equip" | "ritual";
type Position = "attack_face_up" | "defense_face_down";
type Card = Readonly<{
  number: string;
  name: string;
  type: CardType;
  attack?: number;
  defense?: number;
}>;
```
### 6.3 Type Safety
Good:
```ts
function requireCard(card: Card | undefined, number: string): Card {
  if (!card) {
    throw new Error(`card_not_found: ${number}`);
  }
  return card;
}
```
Bad:
```ts
function requireCard(card: Card | undefined): Card {
  return card!;
}
```
Rules:
- Avoid `any`; use `unknown` at boundaries and narrow it.
- Avoid non-null assertion unless an invariant is already proven.
- Use `Readonly<T>` for immutable domain objects.
- Use branded types for IDs when mixing IDs is risky.
- Keep DTOs separate from rich domain state when behavior diverges.
## 7. Functions and Methods
### 7.1 Signatures
Use explicit parameters and return types for exported functions.
```ts
type Result<T, E extends Error = Error> =
  | { ok: true; value: T }
  | { ok: false; error: E };
type DeckValidationError = Error & { code: "invalid_deck" };
export function validateDeck(cards: readonly Card[]): Result<readonly Card[], DeckValidationError> {
  if (cards.length !== 40) {
    const error = new Error(`deck must have 40 cards, got ${cards.length}`) as DeckValidationError;
    error.code = "invalid_deck";
    return { ok: false, error };
  }
  return { ok: true, value: cards };
}
```
### 7.2 Returns and Errors
Good:
```ts
function parseStars(value: string): Result<number> {
  const stars = Number(value);
  if (!Number.isInteger(stars) || stars < 0) {
    return { ok: false, error: new Error(`invalid stars: ${value}`) };
  }
  return { ok: true, value: stars };
}
```
Bad:
```ts
function parseStars(value: string): number {
  try {
    return Number(value);
  } catch {
    return 0;
  }
}
```
### 7.3 Best Practices
- Keep functions small enough to read without scrolling.
- Prefer pure functions in domain modules.
- Use objects for parameter groups with more than 3 or 4 values.
- Keep async functions at I/O boundaries.
- Avoid boolean parameters that change function behavior dramatically.
- Return values that expose intent: `Result`, discriminated unions, or explicit throws.
- Do not mix validation, persistence, and formatting in one function.
- Extract repeated branches only when the abstraction has a good name.
## 8. Error Handling
### 8.1 Philosophy
TypeScript does not type thrown exceptions.
- Throw `Error` or subclasses, never strings.
- Use `unknown` in `catch`.
- Add operation context before crossing a boundary.
- Use domain errors for expected business failures.
- Log at the boundary that owns the operation.
```ts
class DomainError extends Error {
  constructor(
    message: string,
    readonly code: string,
    readonly details: Record<string, unknown> = {},
  ) {
    super(message);
    this.name = "DomainError";
  }
}
function assertDeckSize(cards: readonly Card[]): void {
  if (cards.length !== 40) {
    throw new DomainError("invalid deck size", "invalid_deck_size", {
      expected: 40,
      actual: cards.length,
    });
  }
}
```
### 8.2 Conventions
Good:
```ts
async function loadSnapshot(duelId: string): Promise<DuelSnapshot> {
  try {
    return await readSnapshotFile(duelId);
  } catch (error: unknown) {
    throw new Error(`failed to load duel snapshot ${duelId}`, { cause: error });
  }
}
```
Bad:
```ts
async function loadSnapshot(duelId: string): Promise<DuelSnapshot | undefined> {
  try {
    return await readSnapshotFile(duelId);
  } catch {
    return undefined;
  }
}
```
### 8.3 Best Practices
- Do not swallow errors silently.
- Do not convert every error into a string.
- Preserve `cause` when wrapping errors.
- Include IDs and operation names in boundary errors.
- Convert technical errors into domain-safe messages at API boundaries.
- Avoid logging and rethrowing in every layer.
- Use `finally` for cleanup when resources need deterministic release.
- Use discriminated unions for recoverable domain outcomes.
```ts
function formatUnknownError(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  return "unknown error";
}
```
## 9. Concurrency and Parallelism
### 9.1 Concurrency Model
TypeScript on Node.js uses:
- Event loop for non-blocking I/O.
- Promises and `async`/`await` for asynchronous flow.
- `AbortController` for cancellation.
- `worker_threads` for CPU-bound parallel work.
- Streams for backpressure.
```ts
async function fetchWithTimeout(url: string, timeoutMs: number): Promise<Response> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { signal: controller.signal });
  } finally {
    clearTimeout(timeout);
  }
}
```
### 9.2 Synchronization
Limit concurrency explicitly.
```ts
async function runLimited<T>(
  items: readonly T[],
  limit: number,
  task: (item: T) => Promise<void>,
): Promise<void> {
  const queue = [...items];
  const workers = Array.from({ length: limit }, async () => {
    while (queue.length > 0) {
      const item = queue.shift();
      if (item !== undefined) {
        await task(item);
      }
    }
  });
  await Promise.all(workers);
}
```
### 9.3 Best Practices
- Always await promises or intentionally detach with a named helper.
- Prefer `Promise.allSettled` when partial failure is expected.
- Use `AbortSignal` in I/O APIs that support it.
- Use timeouts around external calls.
- Avoid shared mutable state in async code.
- Do not use worker threads for ordinary I/O.
- Use streams for large files instead of loading everything in memory.
- Shut down servers gracefully on `SIGTERM`.
### 9.4 Common Pitfalls
Bad:
```ts
items.forEach(async (item) => {
  await processItem(item);
});
```
Good:
```ts
for (const item of items) {
  await processItem(item);
}
```
Use `Promise.all` only when all work may run at once.
```ts
await Promise.all(items.map((item) => processItem(item)));
```
## 10. Interfaces and Abstractions
### 10.1 Interface Design
Use interfaces at boundaries, not everywhere.
```ts
interface Clock {
  now(): Date;
}
interface SnapshotStore {
  save(snapshot: DuelSnapshot): Promise<void>;
  load(duelId: string): Promise<DuelSnapshot | undefined>;
}
```
Rules:
- Small interfaces are easier to fake in tests.
- Name interfaces by capability, not implementation.
- Avoid `IUser`, `ICard`, or Hungarian-style prefixes.
- Do not create interfaces for one implementation unless they protect a boundary.
- Prefer type aliases for data shapes and unions.
### 10.2 Implementation
```ts
class SystemClock implements Clock {
  now(): Date {
    return new Date();
  }
}
class MemorySnapshotStore implements SnapshotStore {
  private readonly snapshots = new Map<string, DuelSnapshot>();
  async save(snapshot: DuelSnapshot): Promise<void> {
    this.snapshots.set(snapshot.duelId, snapshot);
  }
  async load(duelId: string): Promise<DuelSnapshot | undefined> {
    return this.snapshots.get(duelId);
  }
}
```
### 10.3 Composition
Compose capabilities carefully.
```ts
interface ReadableStore<T> {
  get(id: string): Promise<T | undefined>;
}
interface WritableStore<T> {
  put(value: T): Promise<void>;
}
type Store<T> = ReadableStore<T> & WritableStore<T>;
```
Guidance:
- Prefer composition over inheritance.
- Keep classes thin when domain functions can be pure.
- Avoid abstract base classes unless shared behavior is real.
- Never expose concrete infrastructure types from domain interfaces.
## 11. Unit Tests
### 11.1 Structure
Use `node:test` in examples because it is built into Node.js.
```ts
import assert from "node:assert/strict";
import { describe, it } from "node:test";
function add(a: number, b: number): number {
  return a + b;
}
describe("add", () => {
  it("returns the sum of two numbers", () => {
    assert.equal(add(2, 3), 5);
  });
});
```
Test naming:
- Name the behavior, not the implementation.
- Use `function_name condition expected_result`.
- Keep one behavior per test.
- Use clear fixtures; avoid mystery data.
- Regression tests should include the bug condition.
### 11.2 Table-Driven Tests
```ts
import assert from "node:assert/strict";
import { test } from "node:test";
function isValidDeckSize(size: number): boolean {
  return size === 40;
}
const cases = [
  { name: "too small", size: 39, expected: false },
  { name: "valid", size: 40, expected: true },
  { name: "too large", size: 41, expected: false },
] as const;
for (const item of cases) {
  test(`isValidDeckSize: ${item.name}`, () => {
    assert.equal(isValidDeckSize(item.size), item.expected);
  });
}
```
### 11.3 Assertions
Good:
```ts
assert.deepEqual(result, {
  ok: false,
  reason: "insufficient_stars",
});
```
Bad:
```ts
assert.ok(result);
```
Rules:
- Assert exact outcomes.
- Avoid snapshots for domain logic unless output is intentionally large.
- Keep assertions near the action under test.
- Do not assert private implementation details.
### 11.4 Commands
```bash
node --test
node --test tests/deck.test.ts
node --test --test-name-pattern "valid deck"
node --test --experimental-test-coverage
node --test --test-reporter=spec
pnpm test
pnpm typecheck
```
If using Vitest in the project stack:
```bash
pnpm vitest run
pnpm vitest run packages/engine
pnpm vitest run --coverage
pnpm vitest --ui
```
## 12. Mocks and Testability
### 12.1 Mock Strategies
Prefer fakes over broad mocks.
- Fake: working in-memory implementation.
- Stub: fixed answer for a dependency.
- Spy: records calls.
- Mock: pre-programmed interaction expectations.
Use the built-in `node:test` mock API when a spy is enough.
```ts
import assert from "node:assert/strict";
import { mock, test } from "node:test";
test("calls reward callback once", () => {
  const onReward = mock.fn();
  onReward("001");
  assert.equal(onReward.mock.callCount(), 1);
  assert.deepEqual(onReward.mock.calls[0]?.arguments, ["001"]);
});
```
### 12.2 Dependency Injection
Inject behavior through interfaces.
```ts
interface RandomSource {
  next(): number;
}
function chooseIndex(length: number, random: RandomSource): number {
  return Math.floor(random.next() * length);
}
const deterministicRandom: RandomSource = {
  next: () => 0.5,
};
```
### 12.3 Test Doubles
Good:
```ts
const fixedClock: Clock = {
  now: () => new Date("2026-07-24T00:00:00.000Z"),
};
```
Bad:
```ts
Date.now = () => 123;
```
Rules:
- Do not mock the module system by default.
- Avoid global monkey patching.
- Prefer constructor or function parameter injection.
- Keep test doubles small and local.
- Reset mocks between tests.
## 13. Integration Tests
### 13.1 Structure and Organization
Separate integration tests by file naming and scripts.
```text
tests/
├── unit/
│   └── deck.test.ts
└── integration/
    └── catalog.integration.test.ts
```
Use integration tests for:
- Filesystem access.
- Database behavior.
- HTTP boundaries.
- Worker thread boundaries.
- Package-level flows.
### 13.2 Selective Execution
```bash
node --test tests/unit
node --test tests/integration
node --test "**/*.integration.test.ts"
pnpm test
pnpm test:integration
```
Recommended scripts:
```json
{
  "scripts": {
    "test": "node --test tests/unit",
    "test:integration": "node --test tests/integration",
    "test:all": "node --test tests"
  }
}
```
### 13.3 Real Dependencies
Guidance:
- Prefer real parsers, real filesystem, and real database migrations in integration tests.
- Use ephemeral temp directories for filesystem tests.
- Use containers for external services when the dependency matters.
- Use deterministic seeds for game state and randomized fixtures.
- Clean up test data after each test.
- Keep integration tests slower but fewer than unit tests.
```ts
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
test("writes catalog artifact", async () => {
  const dir = await mkdtemp(join(tmpdir(), "catalog-"));
  try {
    await writeFile(join(dir, "cards.json"), "[]", "utf8");
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});
```
## 14. Load and Stress Tests
### 14.1 Tools
Common Node.js ecosystem tools:
- `autocannon` for HTTP load tests.
- `wrk` or `k6` for service-level load from outside Node.js.
- Native `node:http` for small custom probes.
- Production telemetry for real latency and error-rate feedback.
Do not treat load tests as unit tests.
### 14.2 Load Benchmarks
Small native probe:
```ts
import http from "node:http";
function requestOnce(url: URL): Promise<number> {
  return new Promise((resolve, reject) => {
    const req = http.get(url, (res) => {
      res.resume();
      res.on("end", () => resolve(res.statusCode ?? 0));
    });
    req.on("error", reject);
  });
}
```
Commands:
```bash
node scripts/load-smoke.ts
pnpm dlx autocannon http://localhost:3000/health
pnpm dlx autocannon -c 50 -d 30 http://localhost:3000/health
```
### 14.3 Concurrency Tests
Stress invariants, not only throughput.
```ts
import assert from "node:assert/strict";
import { test } from "node:test";
test("idempotent reward can run concurrently", async () => {
  const rewards = new Set<string>();
  const apply = async (duelId: string) => rewards.add(duelId);
  await Promise.all(Array.from({ length: 20 }, () => apply("duel-1")));
  assert.equal(rewards.size, 1);
});
```
Rules:
- Record p50, p95, p99, throughput, and error rate.
- Keep test data realistic.
- Run load tests against production-like builds.
- Never run stress tests against shared production data.
## 15. Profiling and Diagnostics
### 15.1 CPU and Memory Profiling
Use Node.js diagnostic flags first.
```bash
node --cpu-prof dist/server.js
node --heap-prof dist/server.js
node --inspect dist/server.js
node --trace-gc dist/server.js
```
Use profiling to answer a specific question:
- Which function consumes CPU?
- Which allocation pattern grows memory?
- Which I/O boundary is slow?
- Which event-loop delay affects latency?
### 15.2 Diagnostic Tools
Native APIs:
```ts
import { monitorEventLoopDelay, performance } from "node:perf_hooks";
const histogram = monitorEventLoopDelay({ resolution: 20 });
histogram.enable();
const startedAt = performance.now();
await Promise.resolve();
const elapsedMs = performance.now() - startedAt;
console.log(JSON.stringify({
  elapsedMs,
  eventLoopP95Ms: histogram.percentile(95) / 1_000_000,
}));
```
### 15.3 Performance Analysis
Commands:
```bash
node --prof dist/server.js
node --prof-process isolate-*.log
node --report-on-fatalerror dist/server.js
node --report-uncaught-exception dist/server.js
```
Rules:
- Capture profiles under representative load.
- Keep profile artifacts out of Git.
- Compare before and after a change.
- Do not optimize a path without measurement.
- Document trade-offs when performance makes code less direct.
## 16. Benchmarks
### 16.1 Writing Benchmarks
Use `node:perf_hooks` for lightweight benchmarks.
```ts
import { performance } from "node:perf_hooks";
function benchmark(name: string, iterations: number, fn: () => void): void {
  const startedAt = performance.now();
  for (let index = 0; index < iterations; index += 1) {
    fn();
  }
  const elapsedMs = performance.now() - startedAt;
  console.log(`${name}: ${elapsedMs.toFixed(2)}ms`);
}
benchmark("parse-number", 100_000, () => {
  Number("123");
});
```
### 16.2 Sub-benchmarks
```ts
const cases = [
  { name: "small deck", size: 40 },
  { name: "large collection", size: 722 },
] as const;
for (const item of cases) {
  benchmark(item.name, 10_000, () => {
    Array.from({ length: item.size }, (_, index) => index).includes(item.size - 1);
  });
}
```
### 16.3 Execution and Analysis
```bash
node scripts/bench.ts
node --conditions=production scripts/bench.ts
node --cpu-prof scripts/bench.ts
```
Rules:
- Warm up code before timing hot paths.
- Benchmark realistic input sizes.
- Report runtime, machine class, and Node version.
- Do not compare debug builds with optimized builds.
- Prefer simple benchmark harnesses for local investigation.
## 17. Optimization
### 17.1 Principles
- Measure first.
- Optimize the hottest path.
- Keep correctness tests before performance changes.
- Prefer data-shape improvements over micro-optimizations.
- Keep trade-offs documented near the changed code.
### 17.2 Common Optimizations
Good:
```ts
const cardsByNumber = new Map(cards.map((card) => [card.number, card]));
function findCard(number: string): Card | undefined {
  return cardsByNumber.get(number);
}
```
Bad:
```ts
function findCard(number: string): Card | undefined {
  return cards.find((card) => card.number === number);
}
```
Use indexed lookup for repeated access.
### 17.3 Memory Optimization
- Stream large files instead of reading entire files.
- Avoid repeated object allocation in tight loops.
- Reuse compiled regular expressions.
- Avoid accidental array copies in hot paths.
- Store normalized data once and reference by ID.
- Keep snapshots serializable and compact.
```ts
const cardNumberPattern = /^\d{3}$/;
function isCardNumber(value: string): boolean {
  return cardNumberPattern.test(value);
}
```
### 17.4 Basic Performance
- Use `Set` for repeated membership checks.
- Use `Map` for keyed lookup.
- Prefer `for...of` in hot loops when it is clearer and faster.
- Avoid JSON serialization inside hot paths unless required.
- Avoid deep cloning as a default habit.
- Cache pure derived values only when recomputation is material.
## 18. Security
### 18.1 Essential Practices
- Never hardcode secrets.
- Validate external input at every boundary.
- Use HTTPS for network communication.
- Rate-limit public endpoints.
- Keep dependencies updated.
- Apply least privilege for tokens and service accounts.
- Avoid logging secrets, passwords, tokens, and full auth headers.
- Treat client input as untrusted, including typed client input.
### 18.2 Tools
Commands:
```bash
pnpm audit
pnpm audit --audit-level high
npm audit --audit-level=high
pnpm outdated
node --permission --allow-fs-read=. dist/script.js
```
### 18.3 Security at API Boundaries
Good:
```ts
function readRequiredString(input: Record<string, unknown>, key: string): string {
  const value = input[key];
  if (typeof value !== "string" || value.length === 0) {
    throw new DomainError("invalid input", "invalid_input", { key });
  }
  return value;
}
```
Bad:
```ts
function readRequiredString(input: any, key: string): string {
  return input[key];
}
```
Rules:
- Use `unknown`, narrow, then trust.
- Escape output in the rendering layer.
- Use parameterized queries.
- Store secrets in environment or secret managers.
- Validate file paths before reading or writing.
## 19. Code Patterns
### 19.1 Early Return
Good:
```ts
function canAttack(monster: Monster, turn: TurnState): boolean {
  if (turn.isFirstTurn) {
    return false;
  }
  if (monster.position !== "attack_face_up") {
    return false;
  }
  return !monster.hasAttackedThisTurn;
}
```
Bad:
```ts
function canAttack(monster: Monster, turn: TurnState): boolean {
  if (!turn.isFirstTurn) {
    if (monster.position === "attack_face_up") {
      if (!monster.hasAttackedThisTurn) {
        return true;
      }
    }
  }
  return false;
}
```
### 19.2 Separation of Concerns
```ts
function calculateBattleDamage(attacker: Monster, defender: Monster): number {
  return Math.max(0, attacker.attack - defender.attack);
}
async function persistBattleResult(result: BattleResult): Promise<void> {
  await writeFile("battle-result.json", JSON.stringify(result), "utf8");
}
```
Rules:
- Domain function computes.
- Adapter function performs I/O.
- UI function renders.
- Server function validates transport and delegates.
### 19.3 DRY
- Remove duplication when it has the same reason to change.
- Keep duplication when premature abstraction would hide intent.
- Extract concepts, not incidental line similarity.
- Prefer a named helper over a shared generic utility with unclear meaning.
### 19.4 Variable Scope
```ts
function formatReward(card: Card, stars: number): string {
  const cardName = card.name.trim();
  if (stars === 1) {
    return `${cardName}: 1 star`;
  }
  return `${cardName}: ${stars} stars`;
}
```
Rules:
- Declare variables near use.
- Use `const` by default.
- Use `let` only when reassignment is intended.
- Avoid module-level mutable state.
## 20. Dependency Management
### 20.1 Principles
- Standard library first.
- Add dependencies for clear leverage, not convenience alone.
- Prefer actively maintained packages.
- Prefer small packages with focused responsibility.
- Read peer dependency ranges before upgrading core tools.
- Keep lockfile changes intentional.
- Avoid duplicate libraries for the same job.
### 20.2 Commands
```bash
pnpm install --frozen-lockfile
pnpm list --depth 0
pnpm why typescript
pnpm outdated
pnpm update --latest --interactive
pnpm audit --audit-level high
pnpm store prune
```
### 20.3 Versioning Rules
- Pin Node.js with `.nvmrc`, `.node-version`, `engines`, and CI image.
- Pin package manager through `packageManager`.
- Keep TypeScript compatible with lint tooling.
- Do not upgrade runtime, compiler, linter, and framework in one large change.
- Commit lockfile updates with the dependency change.
Example runtime files:
```text
24
```
Use that content in `.nvmrc` and `.node-version`.
## 21. Comments and Documentation
### 21.1 Code Comments
Comment why, not what.
Good:
```ts
// Store RNG cursor in state so replays and server validation stay deterministic.
const nextState = advanceRng(state);
```
Bad:
```ts
// Increment index by one.
index += 1;
```
Rules:
- Explain invariants.
- Explain domain exceptions.
- Explain non-obvious performance trade-offs.
- Delete stale comments when behavior changes.
### 21.2 API Documentation
Use TSDoc-style comments for exported APIs.
```ts
/**
 * Applies one validated duel action to a serializable duel state.
 *
 * The function is pure: the input state is not mutated and no I/O is performed.
 */
export function applyAction(state: DuelState, action: DuelAction): DuelResult {
  return { state, events: [] };
}
```
### 21.3 Package Documentation
Each package should document:
- Purpose.
- Public exports.
- Dependency direction.
- Runtime assumptions.
- Test command.
- Data ownership.
Keep docs close to the package:
```text
packages/engine/
├── README.md
├── src/
└── tests/
```
## 22. Database
### 22.1 Approach
TypeScript projects commonly use:
- Raw SQL with a driver.
- Query builders.
- ORMs.
- Generated clients.
Trade-offs:
- Raw SQL is explicit and close to the database.
- Query builders help with composition.
- ORMs reduce boilerplate but may hide query cost.
- Generated clients can improve type safety.
Examples below use Node.js built-in `node:sqlite` because it is native to Node.js 24.
### 22.2 Connection and Driver
Open, configure, and close the database.
```ts
import { DatabaseSync } from "node:sqlite";
type DatabaseConfig = Readonly<{
  path: string;
  timeoutMs: number;
}>;
function openDatabase(config: DatabaseConfig): DatabaseSync {
  const database = new DatabaseSync(config.path, {
    timeout: config.timeoutMs,
  });
  database.exec("PRAGMA foreign_keys = ON");
  database.exec("PRAGMA journal_mode = WAL");
  return database;
}
const database = openDatabase({ path: ":memory:", timeoutMs: 5_000 });
try {
  database.exec("CREATE TABLE cards (number TEXT PRIMARY KEY, name TEXT NOT NULL)");
} finally {
  database.close();
}
```
Use parameterized queries.
```ts
import { DatabaseSync } from "node:sqlite";
type StoredCard = Readonly<{
  number: string;
  name: string;
}>;
function insertCard(database: DatabaseSync, card: StoredCard): void {
  const statement = database.prepare(
    "INSERT INTO cards (number, name) VALUES (?, ?)",
  );
  statement.run(card.number, card.name);
}
function findCard(database: DatabaseSync, number: string): StoredCard | undefined {
  const statement = database.prepare(
    "SELECT number, name FROM cards WHERE number = ?",
  );
  const row = statement.get(number) as StoredCard | undefined;
  return row;
}
```
Bad:
```ts
function findCardUnsafe(database: DatabaseSync, number: string): unknown {
  return database.prepare(`SELECT * FROM cards WHERE number = '${number}'`).get();
}
```
### 22.3 Migrations
Migration principles:
- Keep schema changes versioned.
- Apply migrations once.
- Make migrations deterministic.
- Keep destructive migrations explicit and reviewed.
- Test migrations against realistic data.
Simple native migration table:
```ts
function ensureMigrationTable(database: DatabaseSync): void {
  database.exec(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      version TEXT PRIMARY KEY,
      applied_at TEXT NOT NULL
    )
  `);
}
```
### 22.4 Best Practices
- Use prepared statements or parameterized queries.
- Never concatenate untrusted input into SQL.
- Define indexes for frequent filters.
- Use explicit transactions for multi-step writes.
- Keep connection setup at infrastructure boundaries.
- Keep domain logic outside query construction.
- Handle timeouts and connection failures.
- Keep read models separate when they diverge from write models.
## 23. Logs and Observability
### 23.1 Log Levels
Use consistent severity names:
- `debug`: developer diagnostics.
- `info`: normal lifecycle events.
- `warn`: recoverable problems.
- `error`: operation failed.
- `fatal`: process cannot continue.
Do not log at every layer.
### 23.2 Structured Logs
Native JSON stdout logger:
```ts
type LogLevel = "debug" | "info" | "warn" | "error" | "fatal";
type LogFields = Record<string, unknown>;
function log(level: LogLevel, message: string, fields: LogFields = {}): void {
  const entry = {
    level,
    message,
    time: new Date().toISOString(),
    ...fields,
  };
  const line = JSON.stringify(entry);
  if (level === "error" || level === "fatal") {
    console.error(line);
    return;
  }
  console.log(line);
}
```
### 23.3 Logging Implementation
Include context fields.
```ts
type RequestContext = Readonly<{
  requestId: string;
  userId?: string;
}>;
async function handleReward(ctx: RequestContext, duelId: string): Promise<void> {
  log("info", "reward_apply_started", {
    requestId: ctx.requestId,
    userId: ctx.userId,
    duelId,
  });
  try {
    await Promise.resolve();
    log("info", "reward_apply_finished", { requestId: ctx.requestId, duelId });
  } catch (error: unknown) {
    log("error", "reward_apply_failed", {
      requestId: ctx.requestId,
      duelId,
      error: error instanceof Error ? error.message : "unknown error",
    });
    throw error;
  }
}
```
Bad:
```ts
console.log("failed");
```
Good:
```ts
log("error", "reward_apply_failed", {
  requestId: "req-123",
  duelId: "duel-456",
});
```
### 23.4 Metrics and Observability
Instrument boundaries:
- Request count.
- Request latency.
- Error count.
- Queue depth.
- Event-loop delay.
- Memory usage.
- Active duel sessions.
Native health endpoint:
```ts
import http from "node:http";
const server = http.createServer((request, response) => {
  if (request.url === "/health") {
    response.writeHead(200, { "content-type": "application/json" });
    response.end(JSON.stringify({ ok: true }));
    return;
  }
  response.writeHead(404);
  response.end();
});
server.listen(3000);
```
Rules:
- Keep metric labels low-cardinality.
- Never use user IDs as metric labels.
- Put request IDs in logs, not metric labels.
- Prefer stdout logs in containers.
## 24. Golden Rules
1. Simplicity first.
2. Clean code is code that is easy to read, test, change, and delete.
3. TypeScript strict mode stays enabled.
4. Domain logic is pure unless I/O is the domain.
5. Errors are explicit and contextual.
6. Tests prove behavior, not implementation details.
7. Dependencies are chosen deliberately.
8. Performance is measured before optimization.
9. Logs are structured and emitted at boundaries.
10. Security is handled at every input boundary.
Clean-code checklist:
- A new developer can name the module purpose in one sentence.
- The main function names describe behavior.
- The module has fewer public exports than private helpers.
- Error messages include the failed operation.
- Tests can exercise logic without network or database.
- A reviewer can see what changed without decoding cleverness.
- The code has no dead branches, commented-out blocks, or mystery constants.
## 25. Pre-Commit Checklist
### Code
- [ ] Formatting applied.
- [ ] Linter passes without critical errors.
- [ ] `tsc --noEmit` passes.
- [ ] No new `any` without justification.
- [ ] No non-null assertions without proven invariant.
- [ ] No unrelated refactors mixed with feature work.
### Tests
- [ ] Unit tests pass.
- [ ] Integration tests pass when boundary code changed.
- [ ] Coverage is at least 70% on critical code.
- [ ] Deterministic code has fixed-seed tests.
- [ ] Bug fixes include regression tests.
- [ ] Benchmark results captured for performance-sensitive changes.
### Quality
- [ ] Errors handled explicitly.
- [ ] Resources closed or disposed.
- [ ] Promises awaited or intentionally detached.
- [ ] No hardcoded secrets.
- [ ] Dependencies reviewed for vulnerabilities.
- [ ] Logs contain useful context and no sensitive data.
### Documentation
- [ ] Public APIs documented.
- [ ] README updated when usage changes.
- [ ] ADR updated when architecture changes.
- [ ] Comments explain why, not what.
- [ ] Project commands remain accurate.
### Docker
- [ ] Dockerfile pins Node.js 24 LTS.
- [ ] docker-compose starts successfully.
- [ ] Secrets are not copied into images.
- [ ] Healthcheck reflects process readiness.
Useful final command set:
```bash
pnpm install --frozen-lockfile
pnpm format
pnpm lint
pnpm typecheck
pnpm test
pnpm audit --audit-level high
docker compose up -d
docker compose exec app pnpm test
docker compose down
```
## 26. References
### Official Documentation
- TypeScript Handbook: https://www.typescriptlang.org/docs/handbook/intro
- TypeScript `strict` TSConfig option: https://www.typescriptlang.org/tsconfig/strict
- TypeScript TSConfig reference: https://www.typescriptlang.org/tsconfig/
- Node.js releases: https://nodejs.org/en/about/previous-releases
- Node.js release schedule: https://github.com/nodejs/release
- Node.js test runner: https://nodejs.org/api/test.html
- Node.js assert module: https://nodejs.org/api/assert.html
- Node.js SQLite module for v24: https://nodejs.org/download/release/latest-v24.x/docs/api/sqlite.html
- Node.js permission model: https://nodejs.org/api/permissions.html
### Essential Tools
- pnpm docs: https://pnpm.io
- Prettier docs: https://prettier.io/docs/index.html
- Prettier configuration: https://prettier.io/docs/configuration
- ESLint rules reference: https://eslint.org/docs/latest/rules/
- typescript-eslint rules: https://typescript-eslint.io/rules/
- typescript-eslint typed linting: https://typescript-eslint.io/getting-started/typed-linting/
- Vitest docs: https://vitest.dev/guide/
- Pino docs: https://getpino.io
### Industry Guidelines
- Google TypeScript Style Guide: https://google.github.io/styleguide/tsguide.html
- Airbnb JavaScript Style Guide: https://github.com/airbnb/javascript
- Microsoft TypeScript repository and coding context: https://github.com/microsoft/TypeScript
### Security and Dependency Management
- npm audit docs: https://docs.npmjs.com/cli/commands/npm-audit/
- npm securing your code: https://docs.npmjs.com/packages-and-modules/securing-your-code/
- pnpm audit docs: https://pnpm.io/cli/audit
### Production Codebases Reviewed
- TypeScript compiler repository: https://github.com/microsoft/TypeScript
- ESLint repository: https://github.com/eslint/eslint
- pnpm repository: https://github.com/pnpm/pnpm
- Vitest repository: https://github.com/vitest-dev/vitest
### Project Architecture
- `docs/arquitetura.md`
- `docs/adrs/generated/plataforma/ADR-001-typescript-monorepo.md`
- `docs/adrs/generated/online/ADR-007-servidor-duelo-online-autoritativo.md`
