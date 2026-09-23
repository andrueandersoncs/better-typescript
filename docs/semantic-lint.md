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
2. send the complete file when it fits, otherwise send overlapping file windows;
3. create one independent Noul question per policy and evaluated scope; and
4. classify each policy from its highest returned probability.

Whole-file questions use:

```text
Does the `file` violate the following rule?

Rule:
<verbatim rule file>
```

Window questions use:

```text
Does the `file` fragment contain enough evidence to conclude that the complete file violates the following rule? Answer no when deciding would require omitted surrounding content.

Rule:
<verbatim rule file>
```

The rule file includes its frontmatter and original line endings. Requests never contain diffs, neighboring files, or repository context.

Questions that fit are sent together. If a complete file and policy exceed the 32,000-byte request limit, only that policy uses overlapping file windows. Windows prefer line boundaries, overlap by up to 2,000 source bytes, and ask only whether the shown fragment contains enough evidence to conclude that the complete file violates the policy. The highest window probability becomes the policy result. At most eight requests run concurrently.

A policy that leaves no room for source text still causes an error. Files and policies are never truncated.

Live semantic lint sends selected source text—complete files or windows—and policy text to TypeSafe. Do not run it on repositories whose data cannot be sent to that provider. The normal command and semantic `--dry-run` make no TypeSafe request.

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

The complete policy file is sent verbatim. Write policies whose violations can be demonstrated from one file. Policies that require proving a global absence or comparing distant regions may be inconclusive when an oversized file needs windows.

## Configuration

Semantic-mode commands in `better-typescript.json` include or exclude policies for matching files. Commands apply in order. An explicit `--rules` selection skips semantic-mode commands.

## Dry run

`--dry-run` needs no API key. It reports, for each file:

- complete file byte count;
- applicable policies;
- physical request partitions;
- whether each partition uses a window;
- window start, end, and source byte count;
- question count per partition; and
- encoded request bytes per partition.

## Results

| Probability | Classification | Fails a live run |
| --- | --- | --- |
| `≤ 0.40` | `pass` | No |
| `> 0.40` and below `--threshold` | `review` | Yes |
| At or above `--threshold` | `violation` | Yes |

Live runs exit `0` when clean, `1` for review or violation findings, and `2` for arguments, Git, file, response, or TypeSafe errors. The API key remains in the process environment and is sent only in the TypeSafe authorization header.
