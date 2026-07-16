# ADR-0016: Single-line comments only

## Status

Accepted

## Date

2026-07-16

## Context

The preset previously allowed one privileged comment form: structured JSDoc (a description plus at
least one tag) on an exported API. `no-multi-line-comments` exempted such blocks, and
`require-because-in-comments` skipped them entirely. The `concept-control` check depended on that
privilege: a first-party data structure discharged its rationale obligation with a JSDoc block
carrying a description, one `@modelRole` tag, and `@remarks` prose containing "because" and a
"remov" word.

The exemption carried real costs:

- JSDoc blocks are prose magnets. Most blocks in this repository restated signatures (`@param`,
  `@returns`) instead of recording decisions, exactly the commentary the because rule exists to
  delete.
- The exported-API exemption required export-reachability analysis, JSDoc structure classification,
  and a memoized position index inside `checks/support/comments.ts` — machinery serving only the
  exemption.
- Two comment vocabularies (line comments must argue "because"; JSDoc may describe) meant every
  reader and every check had to know which regime applied where.
- There was no upper bound on comment length, so explanation that belonged in an ADR could squat in
  a comment.

## Decision

### One comment form

Only isolated single-line `//` comments are permitted. `no-multi-line-comments` flags every block
comment (`/* ... */` and `/** ... */`, single-line or spanning), with no JSDoc exemption. It also
flags stacked single-line comments: consecutive comment lines form one multi-line comment even when
only blank lines separate them, so each explanation is exactly one comment line. Two trailing
comments on consecutive code lines are separate comments because code sits between them. Longer
explanations belong in an ADR under `adrs/`.

### Universal because requirement

`require-because-in-comments` applies to every comment with no exempt forms. A comment either argues
why or it is deleted.

### 100-character cap

A new `no-long-comments` check caps every comment at 100 characters, measured over the comment's own
text from its first `/`. The bound matches the Prettier `printWidth` of 100 already enforced on
code.

### Concept rationale is one leading because-comment

`concept-control` reads the rationale for a first-party data structure from the single-line comments
directly above the declaration; the rationale is complete when that text contains "because". There
is no `@modelRole` claim and no required removal-consequence wording — the structural branches
(closed abstraction, redundant alias, duplicate shape, function-derived name, speculative export,
unused fields) do the enforcement that prose cannot. The canonical shape is one line:

```ts
// SourceComment is one comment-token contract because its owners must agree on one shape.
export class SourceComment extends Data.Class<{
```

An earlier iteration of this decision required a two-line stack claiming `@modelRole` and stating
what "removing" the concept would cost. Both requirements were dropped: the role claim restated what
the index already observes structurally, the "remov" test enforced vocabulary rather than reasoning,
and the stack form conflicted with the one-comment-per-explanation rule above.

### Deleted machinery

The structured-JSDoc classifier, exported-API reachability walk, and JSDoc position index in
`checks/support/comments.ts` are deleted, as are the rationale role tables in `concept-control`. The
comments module retains only comment scanning, text slicing, and a whitespace-gap predicate.

## Consequences

- Every JSDoc block in `packages/*/src` was converted: concept rationales became single leading
  because-comments; signature-restating API docs were deleted; genuine why-content was compressed
  into single because-lines within the 100-character cap.
- Comment checks are cheaper: no type-directed export analysis runs for comment classification, and
  the shared comment scan is reused by all three comment checks.
- Rationale prose is now hard-bounded. What no longer fits in isolated 100-character because-lines
  moves into ADRs, which is where multi-paragraph reasoning belonged already.
- The raw comment scanner cannot see comments that follow certain token sequences it mis-lexes
  without parser context (a pre-existing limitation, unchanged by this decision). Converted files
  comply with the policy regardless of whether the scanner currently observes them.
- `prettier-plugin-jsdoc` no longer has anything to format in first-party sources and is removed
  from the Prettier configuration.
