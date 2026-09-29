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
5. recursively split selected spans and ask Choice questions over their left and right halves, retaining multiple plausible branches as an evidence set;
6. ask two independent Nouls over that complete evidence set: whether the policy applies and whether the original file violates it; and
7. report the verdict, selected context, and whether that context covers the entire file.

Selection questions use:

```text
Could the `file` segment provide concrete evidence that the complete file violates the following rule? Answer yes for plausible evidence or necessary context, not merely related code. Answer no if the rule cannot apply to this segment.

Rule:
<verbatim rule file>
```

Each split uses a Choice question:

```text
Which parts of `left` and `right` might contain evidence or necessary context for deciding whether the original file violates this rule? Select both when the relationship between parts matters. Select neither only if neither part can contribute.

Rule:
<verbatim rule file>
```

Options are `left`, `right`, `both`, and `neither`. Both halves are included in the state. The full Choice distribution matters: a single chosen option does not discard a plausible second branch. The search continues toward roughly 400 source bytes per leaf; line boundaries are preferred. A `neither` probability of at least 0.80 drops a branch, and branches within a factor of two of the stronger marginal remain. If routing cannot split within the request limit, it keeps the current span rather than truncating it.

Final applicability question:

```text
Is the subject of this rule present in `file`? Answer yes for any covered operation, even one that complies. Do not decide whether the rule is violated.

Rule:
<verbatim rule file>
```
Applicability uses `true` for a covered operation whether it complies or violates, and `false` when no covered operation is present.

Final violation question:

```text
Do the selected source spans in `file`, considered together, establish a concrete violation of the following rule? Answer yes if they demonstrate a violation even when other code complies. Answer no if the shown behavior follows the rule or omitted context is needed to decide.

Rule:
<verbatim rule file>
```

The final questions receive the same evidence set but are judged independently. Every request includes the project-relative file `path` so the model can apply path-specific policy text. The rule file includes its frontmatter and original line endings. Requests never contain diffs, neighboring files, or other repository context. Final state includes selected source text with original line labels. Selected spans can include distant context that matters together; they do not explain a violation or pinpoint the offending code.

Selection questions over the same span are batched up to the 32,000-byte request limit. Selection spans prefer line boundaries and overlap by up to 2,000 source bytes. At most eight requests run concurrently per stage. If no candidate is selected, routing finds no evidence, or the combined evidence set cannot fit one final request, the result is `inconclusive` without a final probability. No source is silently truncated. A policy that leaves no room for source text still causes an error.

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

`--all` lists tracked and non-ignored untracked files from Git in the current directory, then keeps supported extensions, including `.ts` and `.tsx`. Its dry run lists every selected file even if no policy matches it. `--files` narrows that same Git-visible file set; it does not include ignored files.

Use `--rules` to limit policies:

```sh
npx better-typescript semantic --all --rules function-naming,readonly
```

Rule names are Markdown basenames without `.md`. Catalog-relative paths also work, such as `abstraction/abstract-shared-meaning-not-merely-similar-code`.

## Default policy cutover

The embedded policies distinguish shared behavior from similar-looking code, keep pure calculations outside Effect, and avoid copying a growing accumulator with one-pass construction. Converting already decoded data into a result stays a plain function, even when its caller uses Effect. Local mutable builders require explicit exclusions from the mutation rules. Suitable tagged multiway decisions use Effect `Match`, not forbidden `switch` statements.

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
| No candidate, no evidence branch selected, or selected context too large | `inconclusive` (no final probability) | No |
| Final probability `> 0.40`, but applicability below `0.70` | `inconclusive` (no violation probability) | No |
| Final probability `≤ 0.40` | `pass` | No |
| Final probability `> 0.40` and below `--threshold`, with applicability at least `0.70` | `review` | No |
| Final probability at or above `--threshold`, with applicability at least `0.70` | `violation` | Yes |

Text output marks whole-file selections as `[file-wide context]` instead of displaying a full-file line range. Partial selections appear as `[context lines N-M]`; these are leads to inspect, not precise defect locations. JSON findings retain candidate byte and line ranges and add `evidenceScope`: `file` when the selected range covers every source byte, `localized` when it does not, or omitted when no context was selected. They also include applicability probability when evaluated, the final violation probability when available, and a reason for inconclusive results. Candidate selection and Choice routing are not verdicts. The default violation threshold is `0.70`; the applicability gate stays at `0.70` when `--threshold` changes.

The applicability check is a model judgment, not proof of correctness. The service/Layer policy applies only to files with a service definition or Layer construction; the Effect failure policy applies to fallible effectful operations, not pure checks. A function-local mutable builder remains subject to the immutability policy unless deterministic mutation rules are explicitly excluded for that file. Review concrete findings; use narrow semantic-mode exclusions for policies that do not apply instead of rewriting correct code to satisfy a false positive.

Live runs exit `0` for pass, review, or inconclusive findings without violations, `1` for violations, and `2` for arguments, Git, file, response, or TypeSafe errors. Reviews remain visible in text and JSON but do not fail a run. The API key remains in the process environment and is sent only in the TypeSafe authorization header.
