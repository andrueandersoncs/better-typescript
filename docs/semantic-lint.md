# Semantic lint

`better-typescript semantic` asks whether selected files violate natural-language engineering policies.

The command embeds the default policy catalog. Add project policies under `.better-typescript/rules/`.

See [Semantic lint architecture](./semantic-lint-architecture.md) for the implementation flow.

## Run

```sh
export TYPESAFE_API_KEY="..."
npx better-typescript semantic
```

With no target option, the command reads complete changed, staged, and untracked files from the working tree. Deleted files are skipped because they have no current contents.

For every selected file:

1. select policies whose frontmatter globs match its path;
2. split the file into overlapping, line-aware spans of at most 4,000 encoded source bytes;
3. ask a Noul per span and policy whether it could contain concrete violation evidence or necessary context;
4. merge candidate spans scoring above 0.40 for each policy;
5. ask two independent Nouls over those spans: whether the policy applies and whether the original file violates it; and
6. report the verdict only when applicability is at least 0.70, with candidate source ranges.

Selection questions use:

```text
Could the `file` segment provide concrete evidence that the complete file violates the following rule? Answer yes for plausible evidence or necessary context, not merely related code. Answer no if the rule cannot apply to this segment.

Rule:
<verbatim rule file>
```

Final applicability question:

```text
Does this policy apply to the behavior actually present in `file`? Answer yes only if the selected source spans establish the subject governed by the rule. Answer no when the source is merely related or the rule's subject is absent. Do not infer missing behavior or configuration.

Rule:
<verbatim rule file>
```

Final violation question:

```text
Do the selected source spans in `file` provide enough evidence to conclude that the original file violates the following rule? Answer no if omitted context is needed; do not infer missing code.

Rule:
<verbatim rule file>
```

The two questions receive the same state but are judged independently. The rule file includes its frontmatter and original line endings. Requests never contain diffs, neighboring files, or repository context. Final state includes selected source text with original line labels; reported byte and line ranges locate *candidates*, not proven violations.

Questions over the same span are batched up to the 32,000-byte request limit. Spans prefer line boundaries and overlap by up to 2,000 source bytes. At most eight requests run concurrently per stage. If no span is selected, or all selected spans cannot fit one final request, the result is `inconclusive` without a final probability. No source is silently truncated. A policy that leaves no room for source text still causes an error.

Live semantic lint sends source spans and policy text to TypeSafe. Do not run it on repositories whose data cannot be sent to that provider. Deterministic lint and semantic `--dry-run` make no TypeSafe request.

## Options

```text
--threshold <number>     Violation probability threshold (default: 0.7)
--model <name>           TypeSafe model override (default: jev-latest)
--rules-dir <path>       Additional Markdown rules
--range <from>..<to>     Analyze complete files from a committed range endpoint
--files <glob>           Analyze selected current files; repeat or comma-separate
--all                    Analyze all eligible current files
--rules <name>           Run selected policies; repeat or comma-separate
--json                   Print machine-readable results
--dry-run                Inspect files, policies, partitions, and bytes without API calls
--help                    Show help
```

`--range`, `--files`, and `--all` are mutually exclusive.

## Current files

Use `--files` to analyze selected complete files:

```sh
npx better-typescript semantic --files 'src/**/*.ts'
npx better-typescript semantic --files src/auth.ts,src/session.ts
```

Use `--all` for every eligible current file:

```sh
npx better-typescript semantic --all
```

Use `--rules` to limit policies:

```sh
npx better-typescript semantic --all --rules function-naming,readonly
```

Rule names are Markdown basenames without `.md`. Catalog-relative paths also work, such as `abstraction/abstract-shared-meaning-not-merely-similar-code`.

## Default policy cutover

The embedded policies distinguish shared behavior from similar-looking code, keep pure calculations outside Effect, and avoid copying a growing accumulator with one-pass construction. Local mutable builders require explicit exclusions from the mutation rules. Suitable tagged multiway decisions use Effect `Match`, not forbidden `switch` statements.

Retired selectors have no aliases. Update `--rules` and semantic-mode `better-typescript.json` commands:

| Retired selector | Replacement |
| --- | --- |
| `file-code-organization/eliminate-all-duplication` | `avoid-repetition` for shared behavior; `abstraction/abstract-shared-meaning-not-merely-similar-code` for shared concepts |
| `modularity/extract-shared-concepts-not-merely-similar-looking-code`, `readability/abstract-shared-concepts-not-merely-similar-looking-code` | `abstraction/abstract-shared-meaning-not-merely-similar-code` |
| `modularity/keep-implementation-details-private-by-default`, `simplicity/keep-interfaces-small-and-predictable` | `abstraction/make-the-public-interface-as-small-as-the-contract-allows` |
| `modularity/test-modules-through-their-contracts`, `simplicity/test-behavior-rather-than-implementation-details` | `abstraction/test-observable-guarantees-not-private-structure` |
| `modularity/give-every-module-one-clear-purpose`, `readability/give-each-function-one-coherent-responsibility` | `simplicity/give-each-function-or-module-one-coherent-responsibility` |
| `simplicity/separate-complicated-decision-making-from-external-operations` | `modularity/separate-decision-making-from-external-effects` |
| `readability/make-dependencies-and-side-effects-visible` | `simplicity/make-inputs-dependencies-and-side-effects-explicit` |
| `readability/make-failure-behavior-explicit` | `simplicity/handle-errors-explicitly-and-close-to-the-right-boundary` |
| `readability/make-the-normal-flow-easy-to-follow` | `simplicity/keep-control-flow-shallow` |
| `simplicity/name-things-so-their-purpose-is-clear` | `readability/name-things-by-their-purpose` |
| `simplicity/prefer-obvious-code-over-clever-code` | `readability/prefer-straightforward-code-over-clever-code` |
| `switch-case/prefer-switch-for-multiple-branches` | `switch-case/prefer-match-for-multiple-branches` |

## Committed ranges

```sh
npx better-typescript semantic --range 'release..HEAD'
npx better-typescript semantic --range 'origin/main...HEAD'
```

Range mode selects paths changed by the range and reads each complete file from the range's end commit. Deleted files are skipped. It also reads `better-typescript.json` from the end commit. Untracked and working-tree contents are excluded.

## Project policies

A policy is a Markdown file with one or more project-relative globs:

```md
---
globs:
  - "src/**/*.ts"
---
# Do not commit debugger statements

Remove debugger statements.
```

Files under `.better-typescript/rules/` are discovered recursively. `--rules-dir` selects another additional directory. Invalid or empty policy files stop the run.

The complete policy file is sent verbatim. Write policies whose violations can be demonstrated from one file. Policies that require proving a global absence or comparing distant regions may be inconclusive when selected spans do not supply enough context.

## Configuration

Semantic-mode commands in `better-typescript.json` include or exclude policies for matching files. Commands apply in order. An explicit `--rules` selection skips semantic-mode commands.

## Dry run

`--dry-run` needs no API key. It reports the **selection-stage** plan for each file:

- complete file byte count;
- path-matched policies;
- selection request partitions;
- whether the file was split into multiple spans;
- span start, end, and source byte count;
- question count per partition; and
- encoded request bytes per partition.

Final requests depend on live selection answers, so they are not included in the dry run.

## Results

| Outcome | Classification | Fails a live run |
| --- | --- | --- |
| No candidate span or selected context too large | `inconclusive` (no final probability) | No |
| Final probability `> 0.40`, but applicability below `0.70` | `inconclusive` (no violation probability) | No |
| Final probability `≤ 0.40` | `pass` | No |
| Final probability `> 0.40` and below `--threshold`, with applicability at least `0.70` | `review` | Yes |
| Final probability at or above `--threshold`, with applicability at least `0.70` | `violation` | Yes |

Text output prints each review or violation with candidate line ranges; inconclusive findings without candidate spans are summarized. JSON findings include candidate byte and line ranges, applicability probability when evaluated, the violation probability only for applicable verdicts, and a reason for inconclusive results. Selection scores are not final verdicts. The default violation threshold is `0.70`; the applicability gate stays at `0.70` when `--threshold` changes.

The applicability check is a model judgment, not proof of correctness. The service/Layer policy applies only to files with a service definition or Layer construction; the Effect failure policy applies to fallible effectful operations, not pure checks. A function-local mutable builder remains subject to the immutability policy unless deterministic mutation rules are explicitly excluded for that file. Review concrete findings; use narrow semantic-mode exclusions for policies that do not apply instead of rewriting correct code to satisfy a false positive.

Live runs exit `0` when there are no review or violation findings, `1` for review or violation findings, and `2` for arguments, Git, file, response, or TypeSafe errors. The API key remains in the process environment and is sent only in the TypeSafe authorization header.
