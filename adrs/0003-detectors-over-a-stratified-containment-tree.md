# ADR-0003: Detectors over a stratified containment tree

## Status

Accepted

## Date

2026-07-04

## Context

### The goal this architecture serves

Better TypeScript's end users are **coding agents**. The product is not the per-match list — it is
**high-level refactoring advice computed by matching over violations of the rules themselves**: when
an agent's codebase trips forty findings whose _shape_ is "imperative state manager", the valuable
output is the one architectural instruction (invert into `Ref`/`Layer` inside the Effect runtime),
not forty local edits. ADR-0001 proved this works for a curated two-level special case (syndromes
over rule matches). The purpose of this ADR is to make such **higher-order matches first-class and
unbounded**: authoring a matcher over findings — at any level, over any detector's output, including
other higher-order detectors — must be the same act as authoring a matcher over syntax.

### How the pieces line up

ADR-0001 unified the matcher language across levels with staged evaluation (L0 rules over ASTs, L1
syndromes over match summaries) and signal rules as the bridge between stages. ADR-0002 fixed the
authoring boundary at L0 and, in discussion, produced the recognition/reporting factorization: a
rule is `recognize : Node → Bool` (the matcher) times `report : matched node → strings`
(presentation), and dynamic evidence text constrains only the second function.

Carrying that factorization to its conclusion collapses the remaining species distinction. A rule
and a syndrome are the same thing once reporting is separated: a sentence, a position in the
containment tree where it attaches its output, a role, and a reporter. The two-pass pipeline is not
architecture — it is the two-stratum special case of a schedule that can be computed from the terms
themselves. Unifying rules and syndromes into one detector concept is what removes the ceiling on
higher-order matching: the advice tier stops being a hand-built second system and becomes ordinary
sentences over findings.

## Decision

Adopt the model below and **implement the unification now, as the active project**. The driver is
the product goal above: higher-order advice detectors are not a hypothetical future user of this
machinery — they are the point of the tool. This ADR fixes the vocabulary, the invariants, and the
implementation plan.

### The model

- **Detector** `d = (id, sentence φ_d, level, role)` plus a reporter `finding → strings`. Static
  message/hint (and title/remediation) are the constant reporter. The detector is the unit of
  identity: matcher and reporter are its two attributes, factored but not divorced — there are no
  free-floating matchers and no shared reporters. The factorization is a visibility asymmetry: the
  matcher is the detector's public face to the language (`FindingOf`, the derived `mentions` DAG),
  while the reporter is invisible to evaluation — no sentence at any stratum can depend on
  presentation text, so hinting can change without touching semantics.
- **Finding** `(detectorId, tree-position, evidence, facets)`. `RuleMatch` and `Diagnosis` are both
  findings; evidence is the evaluation trace at every stratum (at stratum 0, the witness set of the
  sentence).
- **Strata are computed, not declared.** Atoms partition by what they consume: syntax atoms read the
  tree; finding atoms read other detectors' outputs. `stratum(d) = 0` when `φ_d` mentions no
  detector, else `1 + max(stratum of mentioned detectors)`. The `mentions` relation is exactly what
  `matcherRuleIds` already derives — the consumption edges built so syndromes cannot lie double as
  the dependency DAG. Evaluation order is its topological sort; acyclicity is a governance test
  beside the existing parity suite.
- **`FindingOf(detectorId)` subsumes `MatchOfRule`/`SignalOfRule`.** The signal bridge stops being a
  mechanism: "signal" reverts to a pure role (feeds summaries; never gates; never printed). Each
  stratum's findings are summarized by the same Summary monoid / path-prefix catamorphism and become
  the next stratum's index.
- **Position and stratum are independent axes.** Rules today occupy (node, 0) and syndromes (file+,
  1); the model also admits (file, 0) — purely syntactic file detectors, already accidentally
  expressible as `And(Kind(SourceFile), AtLeast(n, …))` — (project, 2) — detectors over diagnoses,
  e.g. `AtLeast(3, FindingOf("hot-subsystem"))` — and (node, 1) meta-detectors once region nodes
  (ADR-0001, future work) exist.

### Invariants the model does NOT absorb

1. **Host recognizers remain primitives.** ADR-0002's boundary is unchanged: the 40 host rules
   satisfy the detector _interface_ (findings at stratum 0) while their recognizers stay host code.
2. **Nonmonotone selection stays policy.** Fallback ("fires only when no specific detector fired at
   this position") and deepest-directory-wins are negation/preference within a stratum; stratified
   evaluation cannot express them as sentences. They remain registry/fold policy, stated, not
   smuggled.
3. **Gating is a product rule: `role: finding` ∧ stratum 0.** A higher-stratum detector that gated
   the exit code would double-count its inputs and turn interpretation back into enforcement.
   _Findings must be fixed; signals are measurements; diagnoses are interpretations_ — the
   philosophy is enforced as a governance test, not derived from the algebra.

## Alternatives Considered

### Staged adoption (mechanism lands with its first user)

- Pros: no churn on a freshly verified system; `RuleMatch`/`Diagnosis` JSON stays stable until a
  consumer of the unified form exists.
- Cons: treats higher-order detectors as a speculative future user when they are the product goal;
  every interim capability (witness evidence, reporters, new atoms) risks being built twice against
  two species.
- **Superseded.** This ADR originally chose staged adoption; the decision was reversed once the goal
  was stated precisely — the "first real user" of the general mechanism is the advice tier itself,
  which already exists in curated form. Waiting gated the point of the tool on an event that had
  already happened.

### Never unify (keep Rule and Syndrome as species)

- Pros: no churn.
- Cons: the species diverge — every future capability gets built twice or asymmetrically; the signal
  bridge stays a special mechanism instead of a role; higher-order detectors over diagnoses require
  a third species.
- Rejected: ADR-0001 already committed to "the same kind of thing one layer up"; this ADR names the
  fixed point of that commitment.

## Implementation plan

Phases are ordered by data dependency; every phase lands with the full verification bar (all tests
green, self-lint zero findings, governance suite extended before behavior changes). ADR-0002's L0
unlock batch (`Flag`, `Unwrapped`, report targets, per-rule migrations) is a separate backlog and is
NOT part of this project.

1. **Finding & Detector foundation.** Unify `RuleMatch` + `Diagnosis` into `Finding`
   `(detectorId, position, level, evidence, facets)` and `Rule` + `Syndrome` into `Detector`
   `(id, recognizer, level, role, reporter)` with roles `finding | signal | advice` (today's
   "diagnosis" named for what it is to the end user). Reporters become the presentation seam with
   static strings as the constant default. Repair finding identity: the dedup key drops the message
   string in favor of `(detectorId, position)` plus an evidence discriminator. The wire format moves
   here, once — diagnoses-first text output is preserved; JSON carries one findings array with
   level/role.
2. **Language generalization.** `FindingOf(detectorId)` (and its facet form) replaces
   `MatchOfRule`/`MatchWithFacet`/`SignalOfRule` — clean cutover, syndromes' terms migrated.
   Findings of every stratum feed the same Summary monoid keyed by detector id, making advice
   findings consumable by higher strata. Witness evidence at stratum 0 (`AtLeast` witnesses
   populating `Finding.evidence`) is deferred to ADR-0002's unlock batch: its consumer is
   witness-reporting itself, and payload nothing reads is scaffolding.
3. **Computed schedule.** `stratum(d)` derived from the `mentions` DAG; acyclicity and
   gate-placement (`role: finding` ∧ stratum 0) join the governance suite; a topological scheduler
   replaces the hardcoded L0 → L1 pipeline in `interpretMatches`. Fallback and deepest-wins remain
   registry/fold policy per the invariants above.
4. **The product: higher-order advice detectors.** Port the six existing syndromes as ordinary
   advice detectors (mechanical after 1–3), then author the first genuinely new higher-order matches
   — advice over findings of other advice detectors (e.g. systemic guidance when several subsystems
   are hot) and cross-rule refactoring guidance aimed at coding agents. Update README and the guide
   so the goal chain — rules → findings → higher-order matches → refactoring advice — is stated to
   end users.

## Consequences

- Every capability attaches to the finding/evidence/reporter seams, never to `RuleMatch`-only or
  `Diagnosis`-only paths.
- The governance suite is the enforcement point for every invariant above: registry parity, orphan
  signals, level/placement agreement today; acyclicity and gate-placement tomorrow.
- ADR-0001's layer table remains correct as the two-stratum instance of this model; ADR-0002's
  boundary and appendix are unaffected.
