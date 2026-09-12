# Source and adaptation

Source: [Leonxlnx/unlazy](https://github.com/Leonxlnx/unlazy), revision [`16671491f6679ad9378f52604d3bc2415b4120c7`](https://github.com/Leonxlnx/unlazy/tree/16671491f6679ad9378f52604d3bc2415b4120c7), inspected 2026-09-11. Its package declares version 2.1.0.

Adapted material:

- [Completion workflow](https://github.com/Leonxlnx/unlazy/blob/16671491f6679ad9378f52604d3bc2415b4120c7/SKILL.md)
- [Depth Tree method](https://github.com/Leonxlnx/unlazy/blob/16671491f6679ad9378f52604d3bc2415b4120c7/references/method.md)

The local workflow retains requirement reconciliation, acceptance gates before implementation, meaningful decomposition, leaf and integration evidence, review passes, and honest incomplete handoffs. Its distinguishing job is recovering omitted deliverables or applying explicitly requested completion discipline. Routine implementation, verification, project tracking, and coordination keep their existing owners.

The adaptation reuses an existing task record and repository-native checks. It does not import upstream's JavaScript checker, ledger parser, approval store, dispatch leases, model tiers, templates, or Claude Code Stop hook. Local evidence records therefore have no automatic digest binding or stop enforcement. Authorization follows the host and the user's existing instructions.

Review effort follows unresolved requirements and concrete findings rather than repeated polish without a completion bound. Depth exposes deliverables and integration boundaries; it does not promise exponential effort or override user budgets. No upstream research or performance claims are adopted.

The upstream [MIT license](../LICENSE) is retained unchanged. This is a modified adaptation, not a verbatim installation.

## Local verification

On 2026-09-11, frontmatter, local links, license identity, and `skills add ./skills/help --list` passed. Discovery still exposes one installable `help` skill. `bun test ./evals/skills` passed 13 tests with one optional live test skipped.

Fresh `openai-codex/gpt-5.6-luna` sessions through `omp` 17.2.1 selected `unlazy` for explicit requests and omitted-deliverable recovery, and kept verification-only work with `verify-change`. The routine one-file fix selected `implement-change` and passed runtime acceptance; its overall evaluator result failed because the parsed edit path retained a leading space. Reports are in `.scratch/skill-evals/run-A1KYwR`, `run-BkN9ey`, `run-dWwbPv`, and `run-JhOeB0` respectively.

Two recovery smoke runs recomputed a stale report, created the missing receipt, and updated the existing acceptance record without creating a second ledger. Evidence is in `.scratch/unlazy-verification/run-l3McA8` and `run-3fdWyY`. Both executed substantive checks, but their ledger prose abbreviated a command while referring to additional assertions. The skill explicitly requires full commands or evidence links; these samples do not establish reliable compliance with that instruction or improvement over a no-skill baseline. Raw transcripts retain the executed checks.
