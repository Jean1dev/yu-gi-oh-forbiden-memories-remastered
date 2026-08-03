# Agent guidance

Project skills live in [`.agents/skills/`](.agents/skills/) (Agent Skills standard). Claude Code also finds them via the symlink [`.claude/skills`](.claude/skills).

## Skills

| Skill | Use when |
| --- | --- |
| `duel-feature-prd` | Generating a PRD for a module or feature |
| `spec-writer` | Turning a PRD feature into `spec.md` + `plan.md` |
| `implement-feature` | Implementing from an existing `spec.md` + `plan.md` |

Invoke explicitly (e.g. `/spec-writer`) or let the agent pick them from context.

## Small fixes and adjustments (bugs, tweaks)

Not every change goes through `duel-feature-prd` → `spec-writer` → `implement-feature`. That
pipeline is for **new behavior** — something no PRD/spec has decided yet. A second, lighter path
exists for changes to behavior that is *already* specified, and the project already uses it: `git
log` has standalone `Corrige <o quê>` commits (no PRD, no phases) alongside the
`Adiciona X, <módulo>/F0X fase N` commits the pipeline produces.

**Decide which lane by asking what the fix changes:**

| The fix makes the code match... | Lane |
|---|---|
| a criterion already written in `docs/prds/<módulo>.md` or a `docs/specs/<módulo>/F0X-.../spec.md` (code is wrong, the doc is right) | **Short lane** |
| no existing doc at all (flaky test, lint, copy, local refactor) | **Short lane** |
| a *new* decision that reverses or extends what a doc currently says is correct (even a 1-line rule change) | **Long lane** — but see the exception below |

Rule of thumb: **if the fix makes the code agree with the spec, it's a bug (short lane); if it
makes the spec say something different than it used to, it's a scope change (long lane)**, even
when the diff is tiny.

**Short lane — how to do it:**
1. Fix the code directly, no new `spec.md`/`plan.md`.
2. If the bug also exposed that a `spec.md` was ambiguous or the PRD was silent (no criterion
   existed either way) — add a short correction note in that same `spec.md` (e.g. a line in its
   Decisions table pointing at the reversal) in the **same commit**. Don't reopen
   `duel-feature-prd`/`spec-writer` just for that.
3. Commit as `Corrige <o quê>[, <módulo>/F0X]` — one commit, Portuguese, no `fase N` suffix (that
   suffix is reserved for `implement-feature` phase commits).

**Exception — small UX/behavior adjustments requested directly (not a bug report):** when a
already-implemented feature's spec explicitly documents the old behavior (e.g. a numbered flow
step, an Interaction table row) and the user asks to change it, treat it like the "spec was
ambiguous" case above rather than invoking the full PRD interview: patch the relevant `spec.md`
section in place with the new behavior (note it as a revision, not a rewrite) and ship the code
change in the same commit, still `Corrige`/`Ajusta <o quê>, <módulo>/F0X`. Reserve the full
`duel-feature-prd` interview for changes big enough to need new Capabilities/Error Handling/test
matrices, not a one- or two-paragraph behavior tweak.
