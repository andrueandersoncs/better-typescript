# Semantic lint

`better-typescript semantic` asks whether complete files violate natural-language engineering policies.

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
2. send the complete file as the `file` state;
3. create one independent Noul question per policy; and
4. classify each returned probability directly.

Every question uses this exact instruction:

```text
Does the `file` violate the following rule?

Rule:
<verbatim rule file>
```

The rule file includes its frontmatter and original line endings. Requests never contain diffs, neighboring files, repository context, or partial source chunks.

Questions that fit are sent together. If they exceed the 32,000-byte request limit, they are partitioned and every partition for that file runs concurrently. A complete file and one policy that cannot fit cause an error; the file is never truncated.

Live semantic lint sends complete selected files and policy text to TypeSafe. Do not run it on repositories whose data cannot be sent to that provider. The normal command and semantic `--dry-run` make no TypeSafe request.

## Options

```text
--threshold <number>     Violation probability threshold (default: 0.7)
--model <name>           TypeSafe model override (default: provider default)
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

Rule names are Markdown basenames without `.md`. If a basename is ambiguous, use its catalog-relative path, such as `readability/abstract-shared-concepts-not-merely-similar-looking-code`.

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

The complete policy file is sent verbatim. Write policies that can be judged from one complete file without its path, repository structure, history, diff, measurements, or external rationale.

## Configuration

Semantic-mode commands in `better-typescript.json` include or exclude policies for matching files. Commands apply in order. An explicit `--rules` selection skips semantic-mode commands.

## Dry run

`--dry-run` needs no API key. It reports, for each file:

- complete file byte count;
- applicable policies;
- physical request partitions;
- question count per partition; and
- encoded request bytes per partition.

## Results

| Probability | Classification | Fails a live run |
| --- | --- | --- |
| `≤ 0.40` | `pass` | No |
| `> 0.40` and below `--threshold` | `review` | Yes |
| At or above `--threshold` | `violation` | Yes |

Live runs exit `0` when clean, `1` for review or violation findings, and `2` for arguments, Git, file, response, or TypeSafe errors. The API key remains in the process environment and is sent only in the TypeSafe authorization header.
