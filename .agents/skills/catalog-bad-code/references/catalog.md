# Catalog layout

Root: `.scratch/bad-code/`.

```
.scratch/bad-code/
  README.md
  snippets/NNN-slug.md
  patterns/<kebab>.md
```

Create missing directories when writing the first snippet or pattern. Use relative Markdown links. When renaming a page, fix every inbound link in the same change.

Snippet `## Analysis` records are canonical. Each record binds one observable shape to one existing rule or pattern, one emergence decision, and one reason. Rebuild every pattern `## Evidence` list from those records, then regenerate `README.md`. Unique snippet counts come from those records. If the two directions disagree, repair Evidence and the index from the analyses.

## Index

`README.md` is generated. After every write it must satisfy this contract:

- One row per pattern file and per snippet file; no extras, no broken links.
- Patterns sorted by status (`confirmed`, `prospective`, `rejected`) then slug; snippets sorted by id.
- Status counts equal the pattern files.
- Pattern `Snippets` is the unique snippet ids whose analyses link to that page.
- Snippet `Patterns` lists those links, or `none`.
- `## Confirmed rule candidates` lists every `confirmed` pattern whose `Rule candidate` is not `none`, and no other rows. Omit the section when empty.

```md
# Bad code catalog

Disliked TypeScript shapes mined from maintainer-fed snippets. Not the built-in rule catalog.

Status counts: confirmed N, prospective N, rejected N.

## Patterns

| Pattern | Status | Snippets | Rule candidate |
| --- | --- | --- | --- |
| [name](patterns/name.md) | prospective | 2 | `no-name` |

## Snippets

| ID | Title | Patterns |
| --- | --- | --- |
| [001](snippets/001-slug.md) | title | [name](patterns/name.md) |

## Confirmed rule candidates

Ready for `plan-pattern-remediation` or `implement-lint-rule`:

- [`no-name`](patterns/name.md) — one-line invariant
```

## Snippet

`snippets/NNN-slug.md`. `NNN` is the next unused three-digit id. `slug` is kebab-case from the title, at most 40 characters.

Treat `## Why it is bad` and `## Code` as source: store them as fed, including `unspecified` when the user gave no reason. Rewrite only `## Analysis`.

````md
# <title>

- ID: 001
- Added: YYYY-MM-DD
- Source: conversation | path | paste
- Path: <original path or none>

## Why it is bad

<quoted user reason, or unspecified>

## Code

```ts
<code as fed>
```

## Analysis

### Shape: <short name>

- Observable shape:
- Existing rules:
- Pattern: <link or none>
- Emergence: covered | attached | new-prospective | no-pattern
- Reason:
````

Write one `### Shape:` heading per disliked shape. Several snippets in one request become several files; the set pass only deduplicates prospectives, checks snippet independence, and promotes or demotes agent-owned patterns.

## Pattern

`patterns/<kebab>.md`. The slug is stable.

```md
# <title>

- Status: prospective | confirmed | rejected
- Status-source: agent | human
- Rule candidate: `kebab-name` | none
- Created: YYYY-MM-DD
- Updated: YYYY-MM-DD

## Invariant

Disliked shape. Desired replacement. Why it is bad. Nearest allowed case.

## Detection

The `typescript-go` AST kind or checker fact that would catch it, or `undetectable`.

## Evidence

- Snippets:
- Allowed nearby:

## Overlap

Existing built-in rules and why they do or do not own this.

## Decision

Why this status. Oldest status change first.
```

`Rule candidate` is a kebab-case name absent from `docs/rules.md`. Fill it on `confirmed`. Use `none` otherwise.

## Status

| Status | Meaning |
| --- | --- |
| `prospective` | Hypothesized rule-shaped pattern; still gathering evidence |
| `confirmed` | Stable, reusable, detectable, actionable; ready to plan or implement a rule |
| `rejected` | Covered, one-off, undetectable, no replacement, or declined |

`Status-source: human` is immune to autonomous analysis. A later explicit human decision may replace it.
