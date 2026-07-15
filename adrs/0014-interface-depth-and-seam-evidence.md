# ADR-0014: Interface depth and seam evidence

## Status

Accepted

## Date

2026-07-14

## Context

Better TypeScript needs architecture guidance that rewards deep modules: substantial behaviour
behind a small interface, placed at a real seam, and tested through that interface. The useful
properties are leverage for callers, locality for maintainers, and a test surface that matches the
production interface.

Depth is relational. It cannot be inferred from implementation size, one syntax node, or one call
count. A module can be a function, class, file, package, or tier-spanning slice. Its interface
includes every fact callers must know: operations, parameters, configuration, invariants, ordering,
errors, and performance characteristics. Implementation shape is deliberately not part of that
interface.

The previous fleet mixed useful evidence with rules that contradicted these principles:

- `wide-thin-exports` compared exported statement count with total top-level statement count. This
  was another implementation-to-interface size ratio, which rewards padding and labels four complex
  exported functions as thin.
- `deletion-test-shallowness` said that complexity moving back into callers meant a module failed
  the deletion test. It means the opposite: complexity that reappears across callers is leverage the
  module was providing.
- `hardwired-dependencies` treated nearly every `new` expression inside a function as a collaborator
  and prescribed injection before establishing a second adapter or classifying the dependency.
- `prefer-dedicated-data-structure-files` forced data and behaviour apart while
  `prefer-data-last-module` forced data-last behaviour back beside the data. The two fixes collided,
  and the file split reduced locality.
- `no-single-use-callee` judged private implementation composition even though a deep module may
  contain small internal parts and internal seams.
- `no-root-level-classes`, `no-class-method-implementations`, and `no-abstract-classes` prohibited
  representations rather than assessing the depth of their interfaces. Their remedies could widen an
  interface by exporting implementation functions.
- `no-reexport` prohibited public entry modules and advised direct imports from defining files. That
  can bypass the intended seam. A re-export is shallow evidence, not an unconditional violation;
  caller leverage and the public export map decide whether it earns its keep.
- `pass-through-wrappers`, `single-use-pure-export`, and `bounce-cluster` contained useful
  observations but overclaimed. A one-call function may encode policy, a deep module may have one
  current caller, and directory co-location does not prove a conceptual call path.

The existing checks that prefer returned results over implicit side effects remain compatible with
this model. In particular, `no-void-functions`, `no-callbacks`, and `no-mutation` continue to
provide useful local evidence. `prefer-data-last-module` also remains: colocating data-last
behaviour with its domain data improves locality.

## Decision

### Architectural judgements are derived from silent evidence

Local source checks record facts. They do not report architectural conclusions that require project
context. Architecture Explore keeps these checks silent and derives visible Advice only after
related evidence agrees.

The evidence fleet is:

1. **Pass-through wrappers.** Detect only exact forwarding exports and re-exports. Exact forwarding
   consumes each parameter once, unchanged and in order, as either the receiver or an argument. It
   does not include validation, transformation, duplicated arguments, error mapping, state, or
   policy. Each detection records project caller count so the deletion test can distinguish removed
   indirection from duplicated behaviour.
2. **Interface burden.** Record callable operation count and required parameter count on public file
   surfaces. This is knowledge burden only; it is never divided by or compared with implementation
   statements or lines.
3. **Module graph.** Record resolved project-to-project import edges. Aggregate advice uses actual
   connected paths, not shared directories.
4. **Test-only exports.** Record exported callable implementation helpers referenced by tests but
   neither called nor re-exported by production code. Production re-exports establish interface
   exposure and prevent this classification.
5. **Seam leakage.** Record imports through explicitly internal paths or another package's source
   path and whether the importer is a test. Relative imports to a public source Module within the
   current project are not leakage.
6. **External collaborator construction.** Record collaborator-shaped constructors imported from
   another module and created inside behaviour. Constructors at a composition root, returned
   directly by a factory, standard-library values, and Effect data constructors are not evidence.
7. **Single-adapter seams.** Record exported behavioural interfaces used as injected dependencies
   when the project contains exactly one concrete adapter and no test adapter. Inline contextually
   typed object adapters count, including test adapters.

The derived Advice is:

- **Deletion-test shallowness:** exact forwarders with at most one caller. Deleting them removes
  indirection without spreading behaviour.
- **Wide shallow interface:** a burdensome interface dominated by deletable forwarders. Interface
  burden alone never triggers this Advice.
- **Bounce cluster:** at least three shallow modules connected by resolved import edges.
- **Leaked seam:** repeated imports through internal/source paths.
- **Test past interface:** test-only exports or tests importing internal/source paths.
- **Hard-to-test hotspot:** concentrated external collaborator construction outside composition
  roots.
- **Hypothetical seam:** an injected behavioural interface with one production adapter and no test
  adapter.

### The deletion test uses caller reappearance

For an exact forwarding export:

- zero or one caller means deletion removes an extra name or hop without duplicating policy, so it
  is shallow evidence;
- multiple callers mean the interface currently provides leverage, so the forwarder alone does not
  justify deletion;
- transformed, duplicated, reordered, validated, or stateful calls are not exact forwarding evidence
  at all.

This is deliberately conservative. Missing a shallow wrapper is preferable to advising deletion of a
domain operation that centralizes behaviour.

### Dependencies are classified before seams are prescribed

Pure in-process dependencies need no adapter. Local-substitutable dependencies stay behind an
internal seam and use their real local stand-in. Remote-owned and true external dependencies justify
a port only when production and test adapters actually vary across it.

Static analysis cannot reliably classify every constructor. The source check therefore uses
high-confidence collaborator evidence and remains silent. Aggregate Advice asks for construction at
the composition root and a real production/test adapter pair; it does not prescribe injection for
arbitrary value construction.

### Tests use the production interface

Tests and production callers cross the same external seam. Helpers used only by tests remain private
and are exercised through observable outcomes. Imports through `internal` paths or another package's
`src` paths are seam leakage, including from tests; relative imports to a public source Module in
the current project are allowed. Once a deep interface covers behaviour, tests of superseded shallow
modules are removed rather than layered beneath the new tests.

### Remove representation and file-layout prohibitions

The following checks and their examples are removed rather than weakened or aliased:

- `prefer-dedicated-data-structure-files`;
- `no-single-use-callee`;
- `no-root-level-classes`;
- `no-class-method-implementations`;
- `no-abstract-classes`;
- `no-reexport`.

They do not become compatibility shims. The remaining fleet may still reject concrete behaviour such
as mutation, void side effects, unused exports, or a proven hypothetical seam. It no longer rejects
a class, private helper, colocated domain definition, or public entry module merely because of its
representation.

## Alternatives Considered

### Keep the old checks and soften their hints

- Pros: minimal churn and stable check names.
- Cons: recognition would still produce contradictory or unsupported findings; a better hint cannot
  repair the wrong predicate.
- Rejected: false architectural certainty is worse than missing evidence.

### Measure depth using lines, statements, or AST-node counts

- Pros: simple and cheap.
- Cons: rewards padding, ignores hidden invariants and caller leverage, and labels compact complex
  functions as shallow.
- Rejected: depth is leverage per unit of interface knowledge, not source volume.

### Report every forwarder or constructor locally

- Pros: immediate and easy to explain.
- Cons: flags legitimate public seams, composition roots, adapters, value objects, and high-leverage
  names. It also creates fixes that conflict with one another.
- Rejected: these facts require project-level interpretation.

### Preserve one-adapter interfaces for possible future variation

- Pros: future implementations can be added without changing call sites.
- Cons: callers pay an interface and indirection cost for variation that does not exist. Tests often
  become the excuse for exposing an internal seam.
- Rejected: introduce the seam when the second adapter exists.

### Split data from behaviour for navigability

- Pros: files contain one syntactic category.
- Cons: understanding and changing one concept now requires bouncing between shallow files; it
  directly conflicts with domain locality.
- Rejected: organize around a deep concept, not declaration kind.

## Consequences

- Architecture Explore emits fewer local certainties and stronger aggregate Advice.
- Public interfaces may be functions, classes, object modules, or entry modules.
- Re-exports are allowed when they establish the intended public seam; low-leverage pass-through
  entry modules can still fail the deletion test.
- Private single-use helpers are an implementation choice, not an interface defect.
- Data and its domain behaviour may live together.
- Tests that require implementation-only exports or deep imports become architecture evidence.
- Adding a new architecture heuristic requires stating what observable relationship makes it
  evidence of leverage, locality, seam placement, or testability. Local source size is never
  sufficient.
