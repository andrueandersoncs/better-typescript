---
name: lint-typescript
description:
  Orchestrate the repository TypeScript policy catalog with bounded parallel workers, validate
  findings, remediate them, and verify a clean rerun. Use when asked to lint, check, review, or fix
  TypeScript code, and after changing .ts or .tsx files when the repository's agentic policies
  should be applied.
---

# Lint TypeScript

Treat `docs/policy-catalog/` as the only policy registry and specification. Keep catalog entries
independent, but execute related entries in bounded batches instead of creating one skill or agent
per policy.

## Resolve scope

1. Prefer files or directories named by the user.
2. Otherwise use TypeScript files changed by the current task, including committed, staged,
   unstaged, and untracked changes.
3. If task scope cannot be recovered, use all first-party `.ts` and `.tsx` files.

Resolve the file list before planning. Exclude generated and vendored files unless the user includes
them explicitly.

## Discover policies

Read `docs/policy-catalog/index.md`, then inventory Markdown files below catalog `rules`,
`evidence`, and `advice` directories. Sort paths and use each catalog-relative path without `.md` as
its stable policy ID.

Derive the fleet and lifecycle from the path. Select fleets whose `Active wiring` applies to at
least one scoped file, using `better-typescript.config.ts` when present. Include a fleet when
applicability is uncertain; completeness is more important than speculative exclusion.

Do not discover `lint-rule-*` skills or maintain another policy list. Reject malformed catalog
entries instead of guessing their missing contract.

## Build bounded batches

Execute three ordered phases: evidence, rules, then advice.

- Start batches from the catalog's fleet and thematic directories.
- Keep policies together when they share evidence, semantic indexes, or implementation context.
- Separate policies with incompatible scope or dependencies.
- Target 6–12 entries per batch and never exceed 15.
- Split large directories into stable path-sorted batches; merge small batches only within the same
  fleet and lifecycle.
- Assign each selected entry exactly once per phase.
- Use at most three concurrent worker agents, or fewer when the environment exposes fewer slots.
  Queue remaining batches and refill the worker pool as jobs finish.

Never load the entire catalog into one agent. Give each worker only its assigned entries, scoped
files, required evidence, and this output contract.

## Produce evidence once

Run selected `evidence` batches first. Evidence workers may inspect the whole required Program or
workspace but remain read-only. Generate each shared fact once and reuse it across dependent rule
and advice batches.

Keep compact evidence in coordinator state. If evidence is too large, use a temporary directory
outside the repository and remove it after the run. Never expose evidence entries as user-facing
findings.

Require one evidence block per assigned entry:

```text
EVIDENCE <policy-id>
NONE
```

or one or more normalized facts:

```text
EVIDENCE <policy-id>
FACT <path-or-scope> | <normalized evidence>
```

Use `BLOCKED <reason>` when evidence could not be produced. A blocked dependency blocks every
consumer; it is not a clean result.

## Evaluate rules

Each rule worker must:

1. Read every assigned catalog entry completely.
2. Use its Detection boundary, Exemptions and non-findings, Dependencies, and Guidance as the
   authoritative rule interface.
3. Perform a cheap candidate scan before expensive semantic inspection.
4. Avoid text-only exclusions when the rule requires types, symbols, graph, or workspace context.
5. Open linked implementation sources or tests only when the catalog leaves a material ambiguity.
6. Inspect only the supplied scope and remain read-only.

Require one policy block per assigned entry:

```text
POLICY <policy-id>
CLEAN
```

or one line per finding:

```text
POLICY <policy-id>
FINDING <path>:<line> | <evidence> | <concrete remediation>
```

Use `BLOCKED <reason>` when the policy could not be evaluated. Candidate filtering may produce
`CLEAN` only when it is sufficient for that policy's documented detection boundary.

## Derive advice

Run selected `advice` batches only after all rule results are available. Supply each worker only the
findings and evidence required by its Dependencies section. Record `CLEAN` when documented
prerequisites are absent. Advice workers use the same policy output contract and remain read-only.

## Validate findings

Open every cited location. Reject findings whose evidence is absent, outside scope, or exempted by
the catalog entry. Merge duplicate findings at the same source construct while retaining every
policy that detected it. Treat conflicting remediations as unresolved findings.

## Remediate

For a review-only request, return validated findings without editing. Otherwise fix every validated
finding in the coordinator so overlapping edits remain serialized. Follow repository test and
formatting instructions after editing.

## Verify

Rerun the same selected evidence, rule, and advice plan against the same scope after remediation.
Repeat until every selected policy is clean or a concrete blocker remains. Never claim clean when an
entry or dependency failed to run.

Report the scope, selected fleets, policy count, batch count, peak worker concurrency, findings
fixed, remaining findings, blockers, and verification result.
