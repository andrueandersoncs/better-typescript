# ADR-0001: Layered match interpretation — matches are an IR, not the output

## Status

Accepted

## Date

2026-07-03

## Context

Two rounds of field feedback (running better-typescript against a real Effect
codebase with third-party integration needs) exposed a structural limit: every
finding worth acting on was a _joint_ observation over many matches, while the
tool only speaks per-match.

- ~33 `no-mutation` matches plus `prefer-hash-map`/`no-mutable-variable-declarations`
  in one file meant "this file manages long-lived state outside the Effect
  runtime" — the fix is `Ref`/`PubSub`/`Layer` inversion, not 33 local edits.
- `no-void-functions` and `no-mutation` flagging the _same expression_ meant the
  author was laundering a side effect to appease one rule while tripping another.
- `prefer-curried-data-last-functions` producing 45% of all matches, spread
  everywhere, was evidence about the _rule_, not the code — we deleted it, losing
  the measurement entirely.

Per-match hints structurally cannot say any of this. Incremental patches
(scale-aware hint text, a hotspot section keyed on match density) helped but are
degenerate special cases of a general mechanism.

Key insight: the codebase already contains the shape of the solution. Rules are
algebras folded over the syntax tree (`AstFold<A>` in `src/rules/traverse.ts`;
`compileRules` fuses all rules into one traversal). The same machine can run one
level up: **rule matches form an intermediate representation**, organized by the
project's containment hierarchy, and higher-order matchers fold over _that_.

## Decision

Adopt a layered interpretation pipeline. Each layer is a fold (an algebra) over
the structure produced by the layer below:

| Layer | Carrier                                | Algebra                             | Output                      |
| ----- | -------------------------------------- | ----------------------------------- | --------------------------- |
| L0    | AST per file                           | rules (`AstFold`, fused)            | `RuleMatch` stream + facets |
| L1    | match tree: project ▸ directory ▸ file | syndromes (`Summary` monoid, fused) | `Diagnosis` findings        |
| L2    | findings + matches                     | presentation algebra                | report (text / JSON)        |

### The carrier is two trees glued together

Project ▸ directory ▸ file mirrors the _filesystem_ (directory boundaries are
architectural: packages, subsystems). Below file, future region nodes mirror
_syntax_ (declarations). The fold is indifferent — both are tree-shaped — but
summary semantics differ per level. **Directory-level diagnoses ("this whole
package is a boundary adapter") are a capability no other linter has; being the
only tool that can say such things is an explicit goal, not a side effect.**

### Implementation shape: algebra as discipline, not ceremony

No `Fix`/cata type-level encoding — without HKTs it buys ceremony, not safety.
The load-bearing requirements are:

1. **`Summary` is a monoid** (associative `combine`, `empty`): counts by rule,
   counts by facet, file spread, totals. Because summaries are monoidal and the
   tree is derived purely from path structure, the catamorphism is implemented
   as path-prefix accumulation over HashMaps — no materialized recursive node
   type, identical semantics, monomorphic and cheap (matches are rare by
   construction).
2. **One matcher language spans every level, closed under combinators.** The
   grammar (`src/matcher/language.ts`) has match-level atoms (`MatchOfRule`,
   `MatchWithFacet`, `SignalOfRule`, `AnyFinding`), AST-level atoms (`Kind`,
   `TextEquals`, `TextIncludes` — down to node properties such as identifier
   text), aggregate atoms (`FilesWithFindings`, `CollidingLines`,
   `DominantRule`, `FindingBreakdown`), and combinators (`And`, `Or`, `Not`,
   the counting quantifier `AtLeast`, the ratio quantifier `ShareOfProject`) —
   a counting modal logic over the containment tree. Syndromes are pure data:
   `require`/`observe` lists of sentences in this language.
3. **One language, staged evaluation.** AST fragments evaluate where ASTs
   exist: `matcherRule` compiles a sentence into an ordinary `Rule`
   dispatched by the existing L0 listener machinery (`no-non-null-assertion`
   is defined this way). Summary fragments evaluate where match streams
   exist: the L1 evaluator in `src/runner/evaluateMatcher.ts`, with one
   visible interpreter branch per term — the same deep embedding rules
   already use, where checks emit `NodeListener`/`FileListener` tagged
   classes that `compileRules` dispatches on. **Signal rules are the bridge
   between stages**: an AST-level matcher registered with `role: "signal"`
   is how a syntax observation flows into a higher-level sentence via
   `SignalOfRule`. Two properties hold structurally rather than by
   convention: consumed rule ids are **derived** recursively from the terms
   (a hand-written `consumes` list could lie; terms cannot), and a
   diagnosis's evidence **is the evaluation trace** — the measurements taken
   while deciding to fire — so a syndrome cannot fire without showing why.
4. **Counting is indexed where the Summary can answer.** `AtLeast` over
   indexable atoms reads the monoid index; combinator terms fall back to a
   per-match walk. Signal atoms count only through the index at L1. AST
   atoms measure zero at L1 by design — they belong to L0, and the signal
   bridge carries their observations up.
5. **Facets**: rules already compute per-match features and discard them
   (`noUndefined` classifies every match internally; mutation scope is
   derivable). `RuleMatch.facets` carries them to L1. A feature too noisy to
   show per-match is safe as aggregate evidence — one misclassified match
   cannot flip a 40-match diagnosis.

### Semantics (the product decisions)

1. **`Rule.role: "finding" | "signal"`.** Findings gate the exit code and appear
   in the style guide. Signals feed summaries only: never gate, never render as
   imperatives. "No suppressions" survives restated crisply — _findings must be
   fixed; signals are measurements; diagnoses are interpretations._ A signal was
   never a violation, so hiding it suppresses nothing.
2. **The guide teaches findings only.** Agents paste `rules` output into system
   prompts; a signal rule printed there would be obeyed as law.
3. **Findings-first default output.** Diagnoses render first; matches consumed
   as evidence by a file-level diagnosis collapse under it (count + pointer).
   `--detail` restores the full per-match view. JSON always carries every layer.
   Presentation choice, not policy — the no-config stance holds.
4. **Syndromes never alter match validity.** They interpret and present. A
   syndrome that could demote a finding would be suppressions rebuilt.
5. **Exit codes**: 0 clean, 1 findings, 2 tool/configuration error.

### The proof case: the currying rule returns as signal

`prefer-curried-data-last-functions` was deleted as a finding (45% of a real
run; wrong as a command at every reducer and Proxy handler). It returns with
`role: "signal"`: dense curried-candidate measurements × dense `no-nested-calls`
findings in one file yield the diagnosis **pipeline-hostile module** — "this
file composes inside-out _because_ its functions are not data-last; fix the
signatures once and the nested-call findings dissolve." A deleted rule becomes
the causal explanation for a rule that stayed, at zero noise cost.

## Alternatives Considered

### Flat curated syndrome list over per-file match counts (no hierarchy)

- Pros: a day of work; covers the file-level cases.
- Cons: no directory/project levels (dominance, subsystem diagnoses
  impossible); every syndrome rescans the flat list; no home for facets or
  signal rules.
- Rejected: it hardcodes exactly the special cases the fold generalizes; the
  hotspot section already proved the pattern and its limits.

### Literal recursion-schemes encoding (`Fix<ReportF>`, typed cata)

- Pros: maximal theoretical fidelity.
- Cons: TypeScript lacks HKTs; encoding cost lands on every syndrome author;
  recursive `Schema.Class` requires hand-written encoded interfaces.
- Rejected: the monoid + single fold discipline captures all the value.

### Pairwise rule-combination engine

- Rejected: 50 rules → 1,225 pairs; unmaintainable, and combinations are not
  where the signal is. Syndromes stay curated, few, and evidence-printing.

### Per-match dynamic hints (scope classifier in hint text)

- Rejected earlier for confident-wrong-prescription risk; resurrected safely as
  facets, where aggregation absorbs per-match noise.

## Consequences

- Syndromes mirror rules structurally, because they are the same kind of thing
  one layer up: one module per syndrome in `src/syndromes/`, shared
  infrastructure beside them (`types.ts`, `summary.ts`, `evidence.ts`), and a
  registry in `src/syndromes/index.ts` enforced by a discovery/parity test —
  exactly the `src/rules/` layout and governance. The fold lives beside the
  rule runner in `src/runner/interpretMatches.ts`. Hotspots become the
  file-level fallback syndrome.
- `RuleMatch` gains `facets` (default `[]`); `Rule` gains `role` (default
  `"finding"`). Additive; all existing rules unchanged.
- Governance extends the existing discipline one layer up: every signal rule
  must appear in some syndrome's condition terms (orphan-signal parity test
  over derived consumption); registry placement must agree with each
  syndrome's declared level; syndromes ship trigger + near-miss fixtures
  (plain data — evaluation is a pure function of matches); thresholds live in
  the condition terms themselves, named and reviewable.
- Determinism: diagnoses sort by (level, path, syndrome); collapse derives from
  diagnoses, so default output is stable where it is new.
- The style guide's rule count reads findings only; signal rules are documented
  in their modules, not the guide.
- Region-level tree nodes (file ▸ declaration) are designed-for but not built:
  the path-keyed fold extends by lengthening keys, without changing any
  syndrome's shape.
