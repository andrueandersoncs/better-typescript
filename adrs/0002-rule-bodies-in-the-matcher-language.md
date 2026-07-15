# ADR-0002: Rule bodies in the matcher language — host primitives are the standard library

## Status

Accepted

## Date

2026-07-03

## Context

ADR-0001 unified match interpretation under one language spanning project ▸ directory ▸ file ▸ AST
node ▸ node properties, with staged evaluation (L0 compiles AST fragments into listeners, L1
evaluates summary fragments) and signal rules as the bridge. That left an asymmetry: syndromes are
sentences, but 51 of 52 rule _bodies_ were still hand-written listener interpreters. If the whole
pipeline is "interpreters over a matcher DSL", shouldn't every rule body be a sentence too?

A full audit of all 52 rules says: only if the language can quantify over what the rule consumes.
The bodies split on four hard walls:

1. **The type oracle (~16 rules).** `no-mutation`, `no-void-functions`, `prefer-hash-map`,
   `no-callbacks`, … consult the checker: alias resolution, contextual types, assignability,
   recursive type walks with seen-sets. These are queries against the _type graph_ — a different
   structure than the containment tree the language folds over, and one whose theory (TypeScript's
   type system) is Turing-complete. No decidable pattern language covers it.
2. **Dynamic evidence text (~7 rules).** `prefer-conditional-return` writes the rewritten ternary
   into its hint; `prefer-effect-schema-guard` splices `${propertyName} in ${objectText}` into its
   message. Precisely stated: a rule factors into recognition (`Node → Bool` — the matcher) and
   reporting (matched node → message/hint — presentation). Dynamic text blocks only the current spec
   coupling (`MatcherRuleSpec` = matcher + two static strings), never term composition: reporting
   runs after the boolean decision and outside the algebra, exactly as `describeMatcher` and
   evidence rendering are host-side presentation at L1. This wall therefore names a missing spec
   seam — an optional host reporter — not missing language. The appendix records, per rule, what
   still blocks recognition after reporting is factored out: for most of this tier, walls 1 and 3
   do.
3. **Relational and positional structure (~9 rules).** Sibling-chain analysis
   (`no-manual-type-dispatch`, `no-duplicate-if-bodies`), binder joins (`prefer-option-match`
   captures the scrutinee's name in the condition and searches a branch for `name.value`),
   boundary-aware root-only counting (`no-multiple-boolean-operators`). ADR-0001 already names
   binders and region nodes as future language growth; until they exist these are not expressible.
4. **Report-target selection (~8 rules).** `namedNodeReportTarget` rules match a declaration but
   report its name node. In the compiled form the matched node _is_ the reported node.

Meanwhile 11 rules failed to be sentences only because the language lacked the node-property axis it
already claimed: presence of a named child, a parent-kind guard, a property-scoped subterm.

## Decision

**Grow the language along axes it can genuinely quantify over, and migrate exactly the rules those
axes capture. Everything else is a host primitive — the language's standard library — behind the
same `Rule` interface.**

Three navigation atoms complete the node-property axis:

- `Anything` — true at every node; the unit of `And`. `Property(name, Anything)` reads as bare
  presence.
- `Parent{term}` — evaluated at the node's parent; the root never satisfies.
- `Property{name, term}` — evaluated at the nodes stored under the named property: a single child
  node, or each element of a node array; a missing property never satisfies.

Twelve rules are now sentences compiled by `matcherRule` (`no-throw`, `no-try-catch`,
`no-switch-statements`, `no-for-in-loops`, `no-for-of-loops`, `no-for-loops`, `no-async-functions`,
`no-abstract-classes`, `no-new-error`, `no-explicit-any-return`, `no-array-spread`,
`no-non-null-assertion`). Their fixture tests passed unchanged after migration — byte-identical
matches, positions included — which is the behavior-preservation proof.

The admission criterion for future migrations: **a rule body belongs in the language when it is
expressible as structural queries over the containment tree and node properties, with a static
message, reporting the matched node.** Each wall above names the extension that would move it: a
type-fact axis (wall 1, likely never), payload-producing terms (wall 2, rejected below),
binders/sibling axes (wall 3, named in ADR-0001), a report selector on `MatcherRuleSpec` (wall 4,
cheap and plausible next).

Uniformity was never missing at the levels that matter: every rule presents identically (`Rule`
schema, listener compilation, `role`), and at L1 every rule — compiled or hand-written — is the same
opaque atom (`MatchOfRule`/`SignalOfRule`). Rule granularity is the FFI boundary of the language,
exactly as Effect's own primitives are written in TypeScript, not in Effect.

### Interpreter details fixed by this decision

- **Navigation atoms are dispatch-inert.** `collectKinds` does not descend into `Parent`/`Property`:
  their interiors describe _other_ nodes, so an interior `Kind` must not become a dispatch key (it
  would both fire on the wrong nodes and miss the right ones). A matcher whose only `Kind` atoms sit
  inside navigation compiles to an inert rule; per-rule fixture tests catch that at authoring time.
- **AST atoms still measure zero at L1** (unchanged from ADR-0001); the new atoms fall through the
  same `Match.orElse` seam.
- `describeMatcher` moved from per-tag pipe steps to one `Match.tagsExhaustive` table: the union
  outgrew `pipe`'s 20-argument overloads. Exhaustiveness is preserved.

## Alternatives Considered

### Named semantic FFI atoms (`TypeIsUncontrolled`, `ReturnsVoid`, …)

- Pros: every rule body becomes a term; representation looks fully uniform.
- Cons: each atom would serve exactly one rule. A language whose atoms are one-per-rule is a
  function call wearing language costume: nothing else can reuse the atom, and the term _pretends_
  to be inspectable while its semantics hide in the interpreter — breaking the two structural
  guarantees that justify the deep embedding (derived consumption cannot lie; evidence is the
  evaluation trace).
- Rejected: uniformity of spelling is not uniformity of semantics.

### A type-query sublanguage over the checker

- Pros: would genuinely absorb wall 1.
- Cons: a second language over a different carrier (the type graph), with an undecidable theory
  underneath; every checker call (contextual types, signature resolution, alias walks) becomes a
  term needing schema, evaluator branch, and describe label. Unbounded surface for ~16 rules that
  already work.
- Rejected: the containment tree is what this language is _about_; the type graph deserves either
  nothing or its own considered design.

### Payload-producing matchers (templated messages)

- Pros: absorbs wall 2 inside the language itself.
- Cons: changes the term denotation from `Node → Bool` to `Node → Option<Payload>` plus a template
  system; combinator semantics (what does `Or` do with two payloads?) stop being boolean algebra. It
  rebuilds `NodeListener` inside the language with worse ergonomics.
- Rejected. Distinct from — and superseded by — the host reporter below, which never enters the
  algebra.

### Host reporter on `MatcherRuleSpec` (`reporter: (context) => (node) => strings`)

- Pros: completes the recognition/reporting factorization; the matcher stays pure data and keeps
  every derivability guarantee; precedent exists (`Rule.check` is already a function field in the
  schema); defaulting to the static strings keeps current specs unchanged.
- Cons: the spec is no longer fully serializable (acceptable — the strings were never load-bearing
  for derivation; the matcher still is).
- Adopted via ADR-0003: the reporter is the presentation attribute of the unified `Detector` and
  lands in that project's first phase, not in the L0 unlock batch. The unlock batch (`Flag` + report
  targets + `Unwrapped`) remains this ADR's separate migration backlog, and each migration still
  carries the fixture-identity proof.
- A half-measure is explicitly refused: host rules embedding sentences as internal guards
  (`nodeSatisfies` is available) would create a third category with the inspectability of neither
  tier. A rule is a sentence or a primitive.

### Report selector on `MatcherRuleSpec` (`report: "name"`)

- Pros: one spec field, no algebra change; would unlock the `namedNodeReportTarget` tier
  (`no-class-method-implementations`, `no-data-tagged-class`, `no-root-level-classes`, …) whose
  guards are otherwise expressible with `Property`/`Parent`.
- Deferred, not rejected: adopt when the next such rule is written or one of the existing ones needs
  to change anyway.

## Consequences

- `src/matcher/language.ts` gains `Anything`, `Parent`, `Property`; `matcherRuleIds` sees through
  navigation (consumption stays derived); `describeMatcher` labels them `anything`, `parent(…)`,
  `name(…)`.
- The 12 sentence-rules shrink to spec + strings + examples; their matcher terms are ANF-hoisted
  named constants, so each rule file reads as its own grammar derivation.
- The other 40 rules are not debt. They are primitives: the criterion above says when one migrates,
  and the walls name the language growth required. Migration pressure runs one way — a primitive may
  become a sentence; a sentence never grows back a bespoke interpreter.
- Dispatch inertness of navigation interiors is a documented contract with a regression test (a bare
  `Property(…)` matcher yields zero matches).
- Rule counts, guide output, exit-code semantics: unchanged. 51 finding rules + 1 signal rule.

## Appendix: the complete accounting

Every host-primitive rule, its wall(s), and the concrete blocker. "Untouched" means the audit placed
it here, not that it was skipped; a rule leaves this table only when the named extension lands _and_
its fixtures pass unchanged under the compiled form.

| Rule                                          | Wall                                             | Concrete blocker                                                                                                                                                                                                                                                                   |
| --------------------------------------------- | ------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `no-callbacks`                                | type oracle                                      | parameter callability is a property of the resolved type (`getTypeAtLocation` + call signatures), not the annotation — its own fixture types every parameter with an imported alias; rest params unwrap via `getIndexTypeOfType`; void returns are often inferred, never annotated |
| `no-first-party-schema-declare`               | type oracle                                      | type predicates of signatures; asserted-type resolution                                                                                                                                                                                                                            |
| `no-function-keyword`                         | type oracle                                      | overload detection via `symbol.declarations`                                                                                                                                                                                                                                       |
| `no-inline-closures`                          | type oracle                                      | third-party-callee exemption resolves the callee through the program                                                                                                                                                                                                               |
| `no-instanceof`                               | type oracle                                      | RHS symbol resolution feeds the report                                                                                                                                                                                                                                             |
| `no-mutable-array-methods`                    | type oracle                                      | receiver array-ness: union/intersection walk, base constraints, apparent types, seen-set recursion                                                                                                                                                                                 |
| `no-mutation`                                 | type oracle + dynamic text                       | uncontrolled-type walk, alias resolution, scope classification into facets; scale-matched hint                                                                                                                                                                                     |
| `no-nested-calls`                             | type oracle                                      | curried-call exemption asks whether the inner call produces a callable                                                                                                                                                                                                             |
| `no-void-functions`                           | type oracle                                      | declared-signature return type; contextual-type `permitsVoid` exemption                                                                                                                                                                                                            |
| `prefer-data-last-module`                     | type oracle                                      | data-structure classification of parameter types                                                                                                                                                                                                                                   |
| `prefer-effect-fn`                            | type oracle                                      | Effect return detection via signature; `Effect.gen` symbol resolved to effect module files                                                                                                                                                                                         |
| `prefer-effect-property-accessors`            | type oracle + dynamic text                       | Record-vs-Struct chosen by apparent type; suggestion splices the property key                                                                                                                                                                                                      |
| `prefer-effect-schema-is`                     | type oracle                                      | first-party `_tag` access over the checked type's constituents                                                                                                                                                                                                                     |
| `prefer-hash-map` / `prefer-hash-set`         | type oracle                                      | escape analysis (`constructionEscapesExternally`)                                                                                                                                                                                                                                  |
| `prefer-pipe-function`                        | type oracle                                      | `.pipe` symbol resolved to the effect module                                                                                                                                                                                                                                       |
| `prefer-curried-data-last-functions` (signal) | type oracle + program index                      | contextual types; symbol-use tracking across files                                                                                                                                                                                                                                 |
| `no-duplicate-function-names`                 | program index + type oracle                      | project-wide name index; mutual assignability check                                                                                                                                                                                                                                |
| `no-single-use-callee`                        | program index                                    | whole-program reference classification                                                                                                                                                                                                                                             |
| `prefer-effect-schema-class`                  | program index + dynamic text + tuple syntax      | object construction sites indexed across files; fixed and variadic tuple aliases are rejected directly, including readonly and parenthesized forms                                                                                                                                 |
| `no-mutable-variable-declarations`            | spec coupling (reporting) + missing `Flag` axis  | recognition needs `NodeFlags` (let = `Flag(Let)`, var = neither let nor const), not kinds; message varies let/var — migratable once `Flag` and the host reporter land                                                                                                              |
| `prefer-effect-schema-guard`                  | spec coupling + relational + transparency        | the `in`-expression itself is a sentence (`Kind(BinaryExpression)` + `Property` on operator/left); "inside an if condition" needs an ancestor axis or witness reporting, plus paren transparency; message splices `${propertyName} in ${objectText}`                               |
| `prefer-effect-schema-constructor`            | spec coupling + path axis                        | object literal reachable from a return position through a bounded edge language (parens, ternary branches, short-circuit right) — Kleene over labeled edges; message derives from the literal's `_tag`                                                                             |
| `prefer-conditional-return`                   | dynamic text + relational                        | hint contains the rewritten ternary; consumes statement _sequences_                                                                                                                                                                                                                |
| `prefer-direct-boolean-return`                | dynamic text + relational                        | hint contains the condition text; next-statement lookahead                                                                                                                                                                                                                         |
| `no-duplicate-if-bodies`                      | dynamic text + relational                        | sibling body fingerprints; hint combines both conditions                                                                                                                                                                                                                           |
| `no-manual-type-dispatch`                     | relational                                       | sibling guard chains sharing discriminant identifiers                                                                                                                                                                                                                              |
| `no-multiple-boolean-operators`               | relational                                       | root-only reporting with boundary kinds and ternary-condition edges                                                                                                                                                                                                                |
| `no-nested-if-statements`                     | relational                                       | ancestor walk to a scope boundary; else-edge exemption needs the child's edge name                                                                                                                                                                                                 |
| `prefer-option-match`                         | relational (binder)                              | the scrutinee's name is captured from the condition and joined against `.value` accesses in one branch                                                                                                                                                                             |
| `no-undefined`                                | relational + dynamic text                        | multi-context usage classification (`UndefinedUsageKind`); facets planned                                                                                                                                                                                                          |
| `no-multi-line-comments`                      | missing carrier                                  | comments are not AST nodes; the tree has no comment axis                                                                                                                                                                                                                           |
| `no-class-method-implementations`             | report target                                    | guards are expressible (`Parent` class-like, `Property` body, `Not` override) but the report lands on the name node                                                                                                                                                                |
| `no-data-tagged-class`                        | report target + non-node property                | reports the name node; `HeritageClause.token` is a bare `SyntaxKind` value, not a child node                                                                                                                                                                                       |
| `no-root-level-classes`                       | report target + non-node property                | same extends-token problem; reports the name node                                                                                                                                                                                                                                  |
| `no-raw-object-types`                         | report target + bounded recursion + dynamic text | recursion runs through union/intersection/paren _only_ — a blanket `AtLeast` descendant search would wrongly flag `Promise<{…}>`; dual messages                                                                                                                                    |
| `no-inline-boolean-expressions`               | report target                                    | matches the `IfStatement`, reports its condition; paren transparency                                                                                                                                                                                                               |
| `prefer-implicit-return`                      | report target                                    | reports the arrow's body block; exactly-one-statement is direct-child counting, not descendant counting                                                                                                                                                                            |
| `prefer-effect-array-append-all`              | near miss (paren transparency)                   | shape is expressible except `unwrapExpression`: the language has no parenthesis-transparent evaluation                                                                                                                                                                             |
| `prefer-effect-record-filter-map`             | near miss (paren transparency)                   | same                                                                                                                                                                                                                                                                               |

The near-miss tier names the two cheapest unlocks: a `report` selector on `MatcherRuleSpec` (unlocks
the report-target tier) and a paren-transparent evaluation mode or `Unwrapped{term}` atom (unlocks
the two conditional-spread rules). Each admission still requires the fixture-identity proof.
