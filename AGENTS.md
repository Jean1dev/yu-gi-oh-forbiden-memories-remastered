# Agent guidance

Project skills live in [`.agents/skills/`](.agents/skills/) (Agent Skills standard). Claude Code also finds them via the symlink [`.claude/skills`](.claude/skills).

## Skills

| Skill | Use when |
| --- | --- |
| `duel-feature-prd` | Generating a PRD for a module or feature |
| `spec-writer` | Turning a PRD feature into `spec.md` + `plan.md` |
| `implement-feature` | Implementing from an existing `spec.md` + `plan.md` |

Invoke explicitly (e.g. `/spec-writer`) or let the agent pick them from context.
