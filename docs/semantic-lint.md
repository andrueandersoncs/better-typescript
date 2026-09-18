# Semantic lint

`better-typescript semantic` checks natural-language engineering policies against the current Git change or a committed range.

It keeps deterministic work in Go and uses TypeSafe only for semantic judgments. The binary embeds the default policy catalog. Add project policies under `.better-typescript/rules/`.

## Run

```sh
export TYPESAFE_API_KEY="..."
npx better-typescript semantic
```

Without `--range`, the command reads tracked, staged, untracked, renamed, and deleted paths from the working tree. It then:

1. keeps policies whose frontmatter globs match a changed path;
2. runs exact repository checks in Go;
3. routes domains, paths, and diff hunks with TypeSafe Choice questions;
4. expands imports, importers, tests, manifests, and configuration;
5. filters evidence with independent Noul questions; and
6. evaluates each applicable policy once against bounded evidence.

No request receives the complete repository or raw diff. Requests are limited to 32,000 bytes. Evidence snippets are limited to 6,000 bytes. Independent questions with byte-identical state are packed into bounded requests. Physical TypeSafe requests have no concurrency limit.

Path routing receives each file status, path, and up to four hunk headers. Patch text remains in the later hunk-routing stage.

Live semantic lint sends selected source and policy text to TypeSafe. Do not run it on repositories whose data cannot be sent to that provider. The normal `better-typescript` command and semantic `--dry-run` make no TypeSafe request.

## Options

```text
--threshold <number>     Violation probability threshold (default: 0.7)
--model <name>           TypeSafe model override (default: SDK default)
--review-context <path>  Requirements, rationale, and measurements
--rules-dir <path>       Additional Markdown rules
--range <from>..<to>  Analyze a committed Git range instead of the working tree
--deterministic           Run exact repository checks without TypeSafe
--json                   Print machine-readable results
--dry-run                Print the routing plan without API calls
--help                   Show help
```

`--dry-run` needs no API key and always exits successfully.

`--deterministic` reports and enforces only exact repository checks. It does not require an API key and cannot be combined with `--dry-run`.

## Committed ranges

Use a two-dot range to compare two commits directly:

```sh
npx better-typescript semantic --range 'release..HEAD'
```

Use a three-dot range for a pull request or feature branch:

```sh
npx better-typescript semantic --range 'origin/main...HEAD'
```

Three-dot ranges start at Git's merge base. Range mode excludes untracked and working-tree changes. Changed source and repository context are read from the range's end commit, so the result does not depend on the checked-out file contents. Fetch the base ref before using a remote-tracking name in CI.

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
