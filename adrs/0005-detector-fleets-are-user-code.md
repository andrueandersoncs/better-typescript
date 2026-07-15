# ADR-0005: The kernel is the product — detector fleets are user code

## Status

Accepted

## Date

2026-07-05

## Context

### What field use actually revealed

The built-in fleet — 51 rules and 6 advice detectors — encodes one author's style:
Effect-everywhere, no mutation, Schema at every boundary. Running the tool against real projects
showed that the durable value is not that fleet. It is the machinery underneath it:

- the containment tree (project ▸ directory ▸ file ▸ node) and the Summary monoid folded over it
  (ADR-0001);
- the matcher language with its four interpreters — evaluation, description, derived consumption,
  dispatch-key collection (ADR-0001, ADR-0002);
- the stratified schedule computed from the mentions DAG (ADR-0003);
- the governance discipline: derived consumption cannot lie, evidence is the evaluation trace,
  examples are executable specifications (`tests/ruleExamples.test.ts` proves every bad example
  fires and every good example satisfies the whole guide);
- the reporting surfaces aimed at coding agents: the generated style guide, diagnoses-first output,
  the JSON report.

Another team should be able to run this machinery over **their** opinions. Today they cannot: the
fleet is compiled in. The separation already exists in the code — `src/runner/`, `src/matcher/`,
`src/output/`, and `src/project/` contain no detector ids, and the CLI touches the fleet at exactly
two module constants (`rules` and the advice registry in `src/index.ts`) — but it is a fact about
imports, not a boundary anyone can use.

### What the "no plugins" non-goal was actually protecting

The README refuses "a plugin system" and "a framework for custom third-party rules". Written
precisely, what that stance protects is:

1. **No dynamic plugin discovery.** No config strings resolved to packages at runtime, no rule soup
   assembled from `extends` chains nobody has read.
2. **No suppressions, severities, or per-rule options.** A detector is present or absent; findings
   must be fixed; signals are measurements; advice is interpretation.
3. **Instruction/enforcement coupling.** The guide is generated from the same definitions the linter
   enforces, so they cannot drift.

None of those protections requires the fleet to be first-party. They require the fleet to be
**explicit, reviewed code with executable examples** — which is exactly what the built-in fleet
already is. The non-goal was aimed at ESLint's failure modes, not at user authorship.

### Why authoring must be code, not data

A data-only authoring surface (sentences decoded from JSON) was considered and would preserve every
structural guarantee by construction. It fails the audit in ADR-0002's appendix: the walls are where
real rules live. Sixteen of our own 52 recognizers need the type oracle; others need program-wide
indexes, sibling analysis, or binder joins. A platform whose users can only author
sentence-expressible detectors excludes precisely the detectors worth writing. Our own fleet could
not be authored on it.

The interface that hosts arbitrary recognizers already exists and is proven: ADR-0002 fixed rule
granularity as the FFI boundary of the language, and 40 of 52 built-in recognizers are ordinary
TypeScript behind it. Opening authorship publishes that boundary; it does not invent one.

## Decision

**Invert the package. The kernel is the product; the built-in fleet becomes the reference preset; a
project's detector fleet is user code composed in an explicit config module.**

### The three-layer shape

1. **Kernel** — the published library: the `Detector` species and `Finding` output (ADR-0003), the
   matcher language and its interpreters, the listener compilation and fused traversal, the Summary
   monoid and stratified scheduler, project loading, output formatting, the CLI shell, and the
   governance validators and test harness (below).
2. **Preset** — the current fleet, exported both as named individual detectors and as a composed
   array. Users spread it, cherry-pick it, or ignore it. Replacing a built-in means omitting it and
   adding your own, never shadowing (below).
3. **Config** — `better-typescript.config.ts` in the target repo: ordinary TypeScript that imports
   preset and local detectors and exports one validated registry. The CLI loads this module at
   startup; absence of a config means the preset, so today's zero-config behavior is the default.

### The law that keeps the open fleet sound

**Code sees the program; sentences see findings.**

- A code recognizer receives `ProgramContext` — program, checker, source files — and **never** the
  finding stream. Code detectors are therefore stratum 0 structurally: they are leaves of the
  mentions DAG, so derived consumption stays complete, strata stay computable, and evidence traces
  stay honest, exactly as ADR-0003 requires. This is not a convention to follow; it is the shape of
  the context type, and it is the one interface decision this ADR forbids ever relaxing.
- Composition over findings — one detector quantifying over another's output — happens **only** in
  the matcher language, via `FindingOf`. A user's code detector participates as an opaque atom:
  `FindingOf("acme/no-raw-sql")` in a user sentence works exactly as it does for built-ins.
- **Atoms remain kernel-owned.** ADR-0002 rejected one-consumer FFI atoms for the core; the same
  argument is stronger for third parties: a repo-local atom would make the same sentence mean
  different things in different repos. The detector is the FFI granularity, for everyone.

### Governance moves from test time to composition time

The registry acquires a smart constructor — parse, don't validate:
`Registry.make(detectors, policy)` returns the validated registry or the complete list of violations
(CLI exit 2). The checks are today's governance suite, refactored into pure validators with two call
sites (our test suite, everyone's load path):

- **Duplicate ids rejected.** `FindingOf` resolves by id; shadowing a consumed id would silently
  rewire every downstream sentence.
- **Dangling mentions rejected.** A typo'd `FindingOf` measuring zero forever is the classic
  stratified-evaluation failure; it must not load.
- **Mention acyclicity** over the merged fleet (`hasMentionCycle` exists).
- **Gate placement**: `role: finding` requires stratum 0 (ADR-0003 invariant 3).
- **Orphan signals rejected**: a signal no sentence consumes is a dead measurement.
- **Inert matchers rejected**: a sentence whose dispatch-key set is empty compiles to a detector
  that can never fire; statically decidable from `collectKinds`, today caught only by our own
  fixture tests.
- **Example admission**: finding-role detectors must carry examples; the harness (exported, one
  function call in user CI) asserts every bad example fires its own detector and every good example
  satisfies the fleet's entire finding set — the `ruleExamples` discipline, generalized to fleets we
  did not write.
- **Determinism smoke**: recognizers are contractually pure functions of the program; the harness
  runs a detector twice over its fixtures and diffs. Purity cannot be typed against arbitrary
  TypeScript — it is enforced by contract plus harness, and that is the honest trade of a code
  platform.

### What the guide becomes

`better-typescript rules` renders the **composed fleet's** guide: every repo publishes its own style
law, generated from the same definitions it enforces, examples included, drift-proof. For the
product goal — steering coding agents — this is the payoff of the whole inversion: the agent's
system prompt is repo-specific, and instruction/enforcement coupling now extends to detectors we did
not write.

### What survives unchanged

Within a fleet the philosophy is intact and non-negotiable: no severities, no suppressions, no
per-rule options. Findings must be fixed; signals are measurements; advice is interpretation; exit
codes keep their meanings. The fleet itself is the only degree of freedom, and it is versioned,
reviewed code.

## Alternatives Considered

### Data-only authoring (sentences decoded from wire data)

- Pros: soundness by construction — terms cannot lie, everything serializable, no code execution.
- Cons: excludes every wall in ADR-0002's appendix — the type oracle, program indexes, relational
  analysis — which is where users' most valuable detectors live; our own fleet could not be authored
  on the surface we would be selling.
- Rejected as the boundary; retained as the subset. Sentence detectors (`matcherRule`, advice specs)
  remain pure data inside the code API, and everything previously argued for data authoring still
  holds for them.

### User-extensible atom set

- Pros: users could absorb their own walls instead of waiting on kernel releases.
- Cons: ADR-0002's argument squared — an atom whose semantics live in one repo's interpreter
  extension makes sentences non-portable and evidence non-comparable; every third-party atom is a
  fork of the language.
- Rejected. Pressure for a new atom is a kernel feature request, exactly as it is for the built-in
  fleet.

### Finding-stream access for code detectors

- Pros: "power users could write syndromes in TypeScript."
- Cons: destroys the guarantee chain — a code detector reading findings consumes without declaring,
  so derived consumption is incomplete, strata are wrong, and the scheduler is unsound. Every
  ADR-0003 property hangs on the mentions relation being total.
- Rejected permanently; this is the load-bearing invariant of the platform.

### Dynamic plugin discovery (config strings, `extends` chains)

- Pros: familiar to ESLint users.
- Cons: reintroduces the exact failure the non-goal was protecting against — fleets nobody has read,
  resolved at runtime, drifting under semver.
- Rejected: the fleet is explicit code — imported, composed, reviewed like any other module in the
  repo.

### Severity levels / suppression comments for user fleets

- Rejected without qualification. The no-config stance survives the inversion precisely because it
  moved to the fleet boundary, not because it softened.

## Consequences

- **ADR-0003 phases 1–3 graduate from internal refactor to publish prerequisite.** The authoring
  surface is still mid-unification (two species, reporter seam existing only in comments); freezing
  it now would make every third-party detector a breaking-change casualty. The unification completes
  before anything is published.
- **`typescript` becomes a peer dependency.** Code recognizers call checker APIs; version skew
  between kernel, preset, and user detectors is a real support surface. Pin and document a supported
  range.
- **Fleet serializability shrinks to the sentence subset.** Already true — `check` is a
  `Schema.declare`d function — now acknowledged as permanent. Sentence detectors stay fully
  inspectable; code detectors are opaque atoms with inspectable edges (id, role, level, examples,
  findings).
- **Security is explicitly out of scope.** The config is code the repo owner wrote and reviews, like
  any build script. The threat model is drift and bugs, addressed by the harness, not sandboxing.
- **Determinism and output order become platform contracts.** Agents diff successive runs; the total
  order (level, path, detector id) must remain stable under arbitrary fleets.
- **The README's non-goals are rewritten**, not deleted: "no plugin system" becomes "no dynamic
  plugin discovery; the fleet is explicit code composed in config"; "no custom third-party rules" is
  superseded by this ADR. "Self-hosting" now means: the kernel repo runs the reference preset over
  itself and passes.
- The kernel's public API is the unified `Detector` species, the authoring constructors, the
  language atoms, the harness, and the report schema — semver-disciplined from first publish.

## Implementation plan

1. **Finish ADR-0003** (phases 1, 3-remainder, 4): unified `Detector` with recognizer kinds and the
   reporter seam; one registry; the stratified scheduler owning wave 0; six advice detectors ported;
   naming unified (`syndromes` → `advice`, no compatibility aliases).
2. **Registry smart constructor**: governance suite refactored into pure validators consumed by both
   the tests and `Registry.make`.
3. **Package split**: kernel exports finalized; built-ins move to the preset entry point with named
   exports; the example-admission and determinism harness becomes a public export.
4. **Config loading**: `better-typescript.config.ts` resolved at the CLI edge; absence means the
   preset; violations exit 2 with the full list.
5. **Docs**: README goals/non-goals rewritten per this ADR; the guide's preamble explains fleet
   composition.
