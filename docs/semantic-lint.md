# Semantic lint

`better-typescript semantic` checks natural-language engineering policies against a Git change, selected current files, or all eligible current files.

It keeps deterministic work in Go and uses TypeSafe only for semantic judgments. The binary embeds the default policy catalog. Add project policies under `.better-typescript/rules/`.

See [Semantic lint architecture](./semantic-lint-architecture.md) for the code flow, data transformations, and file map.

## Run

```sh
export TYPESAFE_API_KEY="..."
npx better-typescript semantic
```

With no target option, the command reads tracked, staged, untracked, renamed, and deleted paths from the working tree. It then:

1. keeps policies whose frontmatter globs match a changed path;
2. runs exact repository checks in Go;
3. routes domains, paths, and diff hunks with TypeSafe Choice questions;
4. expands imports, importers, tests, manifests, and configuration;
5. filters evidence with independent Noul questions; and
6. evaluates each applicable policy once against bounded evidence.

No request receives the complete repository or raw diff. Requests are limited to 32,000 bytes. Evidence snippets are limited to 6,000 bytes. Independent questions with byte-identical state are packed into bounded requests. Selected-only interpretation does not cap physical concurrency. Opt-in speculative routing caps logical route evaluations at eight.

Path routing receives each file status, path, and up to four hunk headers. Patch text remains in the later hunk-routing stage.

Live semantic lint sends selected source and policy text to TypeSafe. Do not run it on repositories whose data cannot be sent to that provider. The normal `better-typescript` command and semantic `--dry-run` make no TypeSafe request.

## Options

```text
--threshold <number>     Violation probability threshold (default: 0.7)
--model <name>           TypeSafe model override (default: SDK default)
--review-context <path>  Text file with requirements, rationale, or measurements needed by review rules
--rules-dir <path>       Additional Markdown rules
--range <from>..<to>     Analyze a committed Git range
--files <glob>           Analyze selected current files; repeat or comma-separate
--all                    Analyze all eligible current files
--rules <name>           Run selected semantic rules; repeat or comma-separate
--deterministic           Run exact repository checks without TypeSafe
--json                    Print machine-readable results
--dry-run                 Inspect declared plans and costs without API calls
--trace                   Include a canonical execution trace in JSON results
--speculative-routing     Evaluate known route branches concurrently
--help                    Show help
```

`--dry-run` needs no API key. It prints each complete route tree, automatic selections, question declarations, request bytes, declaration hashes, and structural cost bounds. Relevance and final stages remain explicitly unresolved because their declarations require real routing and selected evidence. Versioned pricing is not configured, so token and monetary cost remain unknown.

Every plan is validated before evaluation. Invalid stage names, identities, parent relationships, question types, ordering, limits, or request sizes stop before a TypeSafe call.

Live JSON findings include question provenance: rule, stage, plan node, evidence id and hash, declaration hash, model, physical request, raw probability, threshold, and policy decision. Source snippets are not copied into provenance.

`--trace` adds canonical plan, question, branch, evidence, final, and finding events to JSON output. Event order follows declaration order, not completion time. A trace records a run; it does not make remote model answers deterministic.

`--speculative-routing` is opt-in. It starts known route branches concurrently, discards unselected answers, ignores errors from discarded branches, cancels work that can no longer be selected, and counts successful discarded work in usage. Relevance, selected evidence, and final judgment remain sequential.

`--deterministic` reports and enforces only exact repository checks. It does not require an API key and cannot be combined with `--dry-run`.

## Current files

Use `--files` to analyze complete current files, even when Git reports no changes. Paths are repository-relative globs. Existing directories select their eligible descendants.

```sh
npx better-typescript semantic --files 'src/**/*.ts'
npx better-typescript semantic --files src/auth.ts,src/session.ts
```

Use `--all` to analyze every eligible current file:

```sh
npx better-typescript semantic --all
```

The selected files are candidates. Semantic-mode commands in `better-typescript.json` select policies for each file. A file with no active semantic policies is not reviewed directly but remains available as supporting context. `--range`, `--files`, and `--all` are mutually exclusive.

Use `--rules` to limit evaluation:

```sh
npx better-typescript semantic --all --rules function-naming,readonly
```

Rule names are Markdown basenames without `.md`. If a basename is ambiguous, use its catalog-relative path, such as `readability/abstract-shared-concepts-not-merely-similar-looking-code`.

The embedded testing policies cover focused or excluded tests, asynchronous ownership, vacuous assertions, independent expectations, typed fixtures, snapshots, nondeterminism, Effect execution and failures, hermetic resources, browser locators and isolation, and property-test execution, laws, domains, sampling, and case isolation. Test configuration changes must not silently weaken repository policy.

## Committed ranges

Use a two-dot range to compare two commits directly:

```sh
npx better-typescript semantic --range 'release..HEAD'
```

Use a three-dot range for a pull request or feature branch:

```sh
npx better-typescript semantic --range 'origin/main...HEAD'
```

Three-dot ranges start at Git's merge base. Range mode excludes untracked and working-tree changes. Changed source, repository context, and `better-typescript.json` are read from the range's end commit, so the result does not depend on the checked-out file contents. Fetch the base ref before using a remote-tracking name in CI.

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

## Review context

Some policies need requirements, rationale, or measurements that source code cannot provide:

```sh
npx better-typescript semantic --review-context review-context.txt
```

When routing finds no applicable changed evidence, the policy is `not_applicable`.

Without review context, applicable review policies report `insufficient_evidence`.

## Results

| Classification | Meaning | Fails a live run |
| --- | --- | --- |
| `pass` | Evidence shows no violation | No |
| `not_applicable` | No matching candidate remains | No |
| `review` | Probability is above `0.4` and below the violation threshold | Yes |
| `violation` | Probability reaches the violation threshold | Yes |
| `insufficient_evidence` | Required evidence is unavailable | Yes |

Live runs exit `0` when clean, `1` for actionable findings, and `2` for arguments, Git, file, response, or TypeSafe errors. The API key remains in the process environment and is sent only in the TypeSafe authorization header.
