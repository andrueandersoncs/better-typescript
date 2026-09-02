---
name: catalog-bad-code
description: This skill should be used when the user asks to "add a bad code snippet", "reanalyze the bad-code catalog", "mark a bad pattern confirmed or rejected", "query the bad-pattern index", or "suggest a rule from cataloged bad code".
---

# Catalog Bad Code

Maintain `.scratch/bad-code/` as the catalog of disliked TypeScript snippets and the bad patterns they support. Suggest rules. Hand confirmed patterns to `plan-pattern-remediation` or `implement-lint-rule`.

Read [references/catalog.md](references/catalog.md) before the first write. Leave catalog changes uncommitted unless asked to commit.

## Operations

Infer the operation from the request. Default a pasted or attached disliked snippet to **Ingest**.

### Ingest

Complete when each fed snippet file exists, every disliked shape has one analysis record, snippet analyses and pattern Evidence agree, affected agent-owned patterns have been promoted or demoted from the new evidence, linked snippet analyses match any pattern identity or status change, and `README.md` matches the catalog contract.

1. Copy each snippet into the next `snippets/NNN-slug.md`. Quote the user's reason under `## Why it is bad`, or write `unspecified`. Store the code as fed.
2. Read `README.md`, current pattern pages, and `docs/rules.md`. Open overlapping rule docs and implementations. Open nearby pattern snippet code when the match is uncertain.
3. For each distinct disliked shape in each new snippet, apply **Emergence** and write one analysis record.
4. On the set: merge duplicate new prospectives, then re-evaluate every affected agent-owned pattern. If a pattern is merged, split, promoted, or rejected, refresh every linked snippet analysis.
5. Rebuild pattern Evidence from snippet analyses. Regenerate `README.md`. Report snippet ids, each emergence decision, and any confirmed rule candidate.

### Reanalyze

Complete when every snippet has one analysis record per disliked shape, pattern Evidence matches those records, agent-owned statuses follow **Status**, human statuses are unchanged, `## Decision` has an entry for every status change this run, duplicate patterns are merged, two-invariant pages are split, and `README.md` matches the catalog contract.

Rerun Emergence for every snippet against current `docs/rules.md` and pattern pages. Report what changed.

### Set status

Complete when the named pattern's `Status` and `Status-source: human` match the request, `## Decision` records the reason, snippet analyses still point at the page, and `README.md` matches the catalog contract.

A later explicit human decision may change a previous human status. Fill `Rule candidate` on `confirmed` with a kebab-case name absent from `docs/rules.md`, plus invariant, nearest allowed case, and replacement. On `rejected`, set `Rule candidate` to `none`. Leave implementation to `plan-pattern-remediation` or `implement-lint-rule`.

### Query

Complete when the answer cites the index and the supporting snippet or pattern pages.

Read `README.md` first. Open pages only for the asked patterns. Name confirmed rule candidates as ready for `plan-pattern-remediation` or `implement-lint-rule`.

## Emergence

Decide per disliked shape, in order:

| Condition | Decision |
| --- | --- |
| An existing built-in rule owns the observable shape | `covered` — cite the rule on the snippet |
| An existing pattern owns the shape | `attached` — link the snippet to that pattern |
| The shape is stable, reusable, detectable with a `typescript-go` AST or checker fact, and has an actionable replacement | `new-prospective` — create a pattern at `prospective` with `Status-source: agent` |
| None of the above | `no-pattern` — record the reason on the snippet |

A default rule needs a clear invariant, a predictable boundary, and an actionable hint. One local example is not a pattern. Project-only taste is not a built-in rule.

## Status

Autonomous analysis writes `Status-source: agent` only on pages it created or already owns. It never changes a human `Status`.

| From | To | When |
| --- | --- | --- |
| (new) | `prospective` | `new-prospective` |
| agent `prospective` | `confirmed` | Two independent snippets, detection holds, no built-in owner |
| agent `prospective` | `rejected` | Covered, one-off, undetectable, or no replacement |
| agent `confirmed` | `rejected` | A built-in rule now owns it, detection fails, or evidence no longer supports it |

Append every status change under `## Decision`.

Merge onto one invariant. If exactly one source is human-owned, the survivor stays human with that status. If two human statuses conflict, ask one question and write nothing. Split one page per invariant: human-owned children inherit `Status-source: human` and the parent status; agent-owned children are re-evaluated.
