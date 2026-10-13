# Cross-file evidence for semantic lint

Status: needs-triage

## Problem

Semantic lint judges one file at a time. No request contains any other file, so violations that only other files can prove are never found.

- Since `d0c0cb7bc`, CONTEXT.md defines a Policy as "a requirement that can be judged from one complete file". That commit deleted import, importer, test, config, and peer expansion, along with 55 policies.
- The eval set cannot show this gap. Its cases are files some pipeline variant already flagged, and labelers saw only one file (journal entry 33).

## Evidence (journal entries 32–33)

| Sample | Violations | Needed other files | Files with at least one |
| --- | --- | --- | --- |
| 46 random files from 23 repositories, all applicable policies | 136 | 17 (12.5%) | 13 (28%) |
| Repository-class policies only | 20 | 16 (80%) | — |
| Span, file, and neighbors policies | 116 | 1 | — |

- The decisive other file came from lexical-similarity retrieval 14 times, from imports 4 times, and from users of an export once.
- Import neighbors alone gave no measurable gain (entry 32).
- Spot-checked findings are real. `lit-query` `useIsFetching.ts` and `useIsMutating.ts` are near-identical controllers. OpenBot's two people integration tests copy the same `person()` fixture.
- Seeds: [`seed-violations.jsonl`](seed-violations.jsonl).

## Terms

| Term | Meaning |
| --- | --- |
| **Target file** | The file a finding is about |
| **Repository evidence** | Blocks from other files that may help judge the target file |
| **Retriever** | A deterministic, rule-agnostic function that proposes repository evidence |

## Design

Generic, with no per-policy configuration. Any user policy benefits without declaring anything.

```text
target file ──► candidate (unchanged, shared across policies)
                    │
retriever ──► repository evidence blocks (computed once per file, shared)
                    │
                    ▼
evidence stage: the same per-block question, over target blocks + repository blocks
                    │
                    ▼
final stage: selected blocks, each labeled `path:lines`
                    │
                    ▼
finding about the target file; may cite other paths
```

- **Retriever, in order:** (1) lexically similar code blocks across the repository, using IDF-weighted identifier overlap; (2) imports and importers; (3) files that use the target's exports. Bounded to K blocks per file.
- **Batching kept:** the candidate stage is unchanged, and retrieval runs once per file, not per policy (entry 32: per-policy inputs tripled cost).
- **Policy definition:** "a requirement judged for one file, using that file and repository evidence."

## Delivery order

1. **Cross-file eval split.** Add unbiased random-file cases with repository context: 2 blind labelers, at least 50 cross-file violations, and controls. Let cases name a repository root so the harness can retrieve evidence. Without this, the change cannot be measured.
2. **Retriever.** Go, deterministic, built from the existing `git ls-files` snapshot. Add a dry-run report of retrieved blocks and bytes.
3. **Evidence and final stages** accept repository blocks. Final evidence labels its spans `path:lines`, and `Finding` gains cited paths.
4. **Measure** against the shipped pipeline: cross-file recall, `ext-test` regression, tokens. Adopt only if `ext-test` holds and cross-file recall rises.
5. **Docs:** CONTEXT.md, `docs/semantic-lint.md`, and `docs/semantic-lint-architecture.md`. Reconsider the 55 deleted policies.

## Open questions

- Token budget for repository evidence per file (K and bytes).
- Should a finding be able to belong to two files, for example both copies of a duplicate?
