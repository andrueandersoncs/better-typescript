# Plan: control-concept-proliferation

## Status

Accepted for implementation on `control-concept-proliferation`.

## Problem

Every first-party object that crosses a function seam is a concept, and every function is an
abstraction. Both add interface, review, and maintenance cost. Coding agents currently satisfy local
style checks by introducing a named type, promoting it to an Effect data class, moving it into a
dedicated file, and then adding more helpers around it. Each step makes the unnecessary concept look
more established without proving that either the data structure or its function seam earns its cost.

Anonymous object types are not an acceptable escape. They conceal the concept from naming, reuse,
depth, and deletion analysis. The policy remains that a first-party object crossing a function seam
must have a specific semantic name. Naming is admission into architectural review, not approval to
keep the concept.

## Invariants

1. A first-party object may not cross a function seam anonymously.
2. A new data structure must represent semantics independent of one function's parameter or return
   syntax.
3. A function and the data structures used exclusively by its interface are one abstraction claim
   and must be reviewed together.
4. References created inside that claim do not prove reuse. Only independent consumers outside the
   function-data cluster establish leverage.
5. An abstraction that has one external owner and no invariant, protocol, recursive, or
   external-boundary role should be deleted or merged.
6. Existing domain concepts must be reused before a structurally equivalent concept is introduced.
7. Data-file placement and documentation happen only after deletion, reuse, merging, and depth
   analysis.
8. A concept directory is the Module for depth analysis. Its `data.ts` and algorithm files are not
   independent Modules merely because they are separate files.
9. Explanatory prose never suppresses contradictory structural evidence.

## Vocabulary

### Data structure

A named first-party model declaration, including:

- an interface with data properties;
- an object, tuple, union, or intersection type alias that carries data;
- an Effect `Schema.Class`, `Schema.TaggedClass`, `Schema.TaggedError`, or `Schema.TaggedRequest`
  declaration;
- an Effect `Data.Class` or tagged data-class declaration;
- an enum or a first-party runtime schema value used as a named model.

Function-only aliases and third-party declarations are not data structures. Primitive aliases are
data structures only when they add nominal or validated semantics, such as a brand or refinement.

### Independent owner

The nearest top-level first-party declaration containing a symbol reference. Multiple annotations,
constructions, reads, or helper calls inside the same owner count once. Declaration references do
not count.

### Function-data cluster

A connected group of first-party function declarations and data structures linked by parameter,
return, construction, property-use, and call edges. Strongly connected internal references are
collapsed before leverage is measured. Only edges from owners outside the collapsed cluster count as
external leverage.

### Model role

A reason a data structure can earn its existence:

- `shared`: independently consumed by multiple owners;
- `boundary`: decoded, encoded, persisted, or exposed through an intentional external interface;
- `invariant`: construction enforces semantics beyond field collection;
- `protocol`: participates in a tagged request, event, error, or closed union;
- `recursive`: represents actual recursive data.

A plain export, file move, constructor helper, guard, or mapping adapter is not a model role by
itself.

## Remediation order

Diagnostics and examples must preserve this order:

1. Delete a closed function-data cluster.
2. Reuse an existing concept.
3. Merge overlapping concepts or their owning Modules.
4. Deepen the function or Module until it hides real behavior.
5. Retain a distinct named data structure only when evidence remains.
6. Put the retained model in the Module's data file.
7. Document the abstraction claim.

No remediation may recommend an inline raw object type.

## Existing-check corrections

### `no-raw-object-types`

Keep the prohibition. Replace the current single-path hint, which always tells the author to define
a new named type, with a decision in remediation order: reuse an existing semantic model; otherwise
reconsider or remove the function seam; introduce a model only when the data has independent
semantics.

### `prefer-effect-schema-constructor`

Keep reporting first-party raw object returns. Its hint must not make defining a new `TheData` class
the default. Prefer an existing schema constructor; otherwise identify the semantic model or remove
the procedural function seam before adding a class.

### `prefer-effect-schema-class`

Schema representation is subordinate to deletion and reuse. An interface or alias that belongs to a
closed or redundant concept must be removed rather than promoted. When promotion is still correct,
the existing Schema/Data guidance remains.

### `prefer-dedicated-data-structure-files`

Retained Module-owned data structures live in a designated `data.ts`. Private implementation
structures may not evade concept analysis by remaining beside an algorithm. Placement is not
evidence that a model is necessary.

### `prefer-data-last-module`

"Lives with" means inside the declaration's concept directory, not necessarily inside the exact
declaration file. Data-last algorithms and `data.ts` therefore form one Module without violating
file separation.

### Depth checks

`wide-thin-exports`, deletion-test advice, bounce analysis, and related Module signals must
aggregate a concept directory rather than interpreting `data.ts` as a standalone shallow Module.

## Required local checks

### Data-structure rationale

Every first-party data-structure declaration must have structured JSDoc that:

- names the semantic concept;
- declares one model role;
- explains why existing concepts do not represent it;
- gives a concrete deletion counterfactual;
- does not restate fields.

Canonical form:

```ts
/**
 * A validated invoice awaiting settlement.
 *
 * @remarks
 *   This is distinct from InvoiceDraft because settlement requires finalized
 *   totals and a stable identifier. Removing it would make settlement and
 *   persistence reconstruct that invariant independently.
 * @modelRole boundary
 */
```

The role tag makes the claim explicit. Structural analysis validates detectable roles. JSDoc never
suppresses low-leverage, duplicate, or closed-cluster signals.

### Redundant aliases

Report aliases and empty extensions that introduce a second name without a new invariant,
representation, or external seam. Derived aliases used once are also redundant. Branded/refined
types and intentional independently evolving boundary contracts remain eligible after rationale and
role validation.

### Structural-role names

Names such as `FooInput`, `FooOutput`, `FooResult`, `FooParams`, `FooOptions`, `FooContext`,
`FooState`, `FooData`, `FooInfo`, and `FooModel` are evidence that the model was derived from a
function or implementation role instead of domain semantics. Report the high-confidence case where
the stem matches its sole function owner. Boundary request/response vocabulary is not rejected
solely by suffix.

### Unused data fields

Report fields that are only declared, constructed, or mechanically forwarded and are never
independently read. Private structural models are reported directly. Runtime schemas and public wire
models contribute architecture evidence because reflection and external consumers can make local
read counts incomplete.

### Speculative exports

Report a data structure exported from a non-public source Module when no first-party owner imports
or exposes it intentionally. Exporting a declaration must not be a way to evade single-use analysis.

## Required program analysis

One program index must classify functions, data structures, owners, fields, constructions, calls,
imports, exported interfaces, and structural signatures. All concept checks derive from that index
so classification and performance are consistent.

### Closed abstraction cluster

Report a function-data cluster when it has at most one external owner and none of its models has
validated boundary, invariant, protocol, or recursive semantics. The remediation is to collapse the
cluster into its owner or merge it with an existing Module, not to anonymize the data.

### Function-derived data structure

Report a model whose independent use is limited to one function interface, especially when the name
is derived from that function. Report the model and function together so deleting one cannot leave
the other looking justified.

### Parameter-bag abstraction

Detect a model constructed immediately before one function call and then only destructured or
forwarded by that function. The remediation is to remove the function seam, reuse existing domain
values, or turn the model into a genuine command with independent semantics. Exploding the object
into primitive parameters is not an approved fix.

### Function-model leverage

Record function call-site count, independent model consumers, construction sites, boundary
operations, invariant evidence, protocol membership, recursive references, pass-through conversions,
and exports. Direct diagnostics and architecture advice must present this evidence instead of
relying on prose.

### Circular concept justification

Collapse strongly connected function-model subgraphs before counting reuse. Sibling models,
constructors, guards, and adapters that only reference one another do not establish leverage.

### Equivalent and overlapping models

Report exact first-party structural duplicates with the existing candidate and both consumer sets.
Near matches are architecture evidence rather than direct failures because independently evolving
seams may overlap intentionally.

### Pass-through data conversions

Report conversions where every output field copies the same-named input field without
transformation. This is evidence of parallel representations. A real boundary can justify the
conversion, but it must remain visible to review.

## Architecture advice

The raw program evidence is combined into two reviewer-facing diagnoses:

### Closed abstraction

A function and its private data vocabulary have one external owner and can be removed together
without redistributing domain knowledge.

### Concept proliferation

A Module contains multiple low-leverage models, equivalent shapes, function-derived names, unused
fields, or pass-through conversions. The report must enumerate evidence counts and point to concrete
declarations.

These are diagnoses over direct evidence, not independent heuristic lint rules.

## Anti-gaming requirements

- Exporting a declaration does not count as consumption.
- Constructors, guards, schema helpers, and adapters owned by a model remain inside its cluster.
- Cross-references among newly introduced models are collapsed before counting leverage.
- Adding a pass-through conversion creates evidence against the new model.
- Adding unused fields or variants creates its own signal.
- Moving a declaration into `data.ts` does not establish necessity.
- JSDoc does not suppress structural evidence.
- Raw identifier-reference counts are never used as a substitute for independent owners.

## Performance constraints

- Build the concept index once per current `ts.Program` identity.
- Traverse project source files once for index construction.
- Resolve symbols through the TypeScript checker; do not compare names as a substitute for identity.
- Hash normalized concrete shapes before comparing candidates; avoid an unrestricted quadratic pair
  scan.
- Preserve the repository benchmark's measured mean below 100 ms.

## Observable acceptance

The implementation is complete when:

1. Raw object parameter and return types remain prohibited without suggesting anonymous objects as a
   fix.
2. Existing rule hints follow deletion/reuse/deepening precedence.
3. Every first-party data structure is documented with the rationale contract or removed.
4. Redundant aliases, closed function-model clusters, sole-function structural names, parameter
   bags, speculative exports, unused fields, equivalent models, and pass-through conversions are all
   detected at their specified confidence level.
5. Internal references cannot manufacture leverage.
6. Data-last algorithms may live beside `data.ts` in one concept directory.
7. Depth advice treats that directory as one Module.
8. The repository self-hosts with no reportable signals.
9. The measured benchmark remains below 100 ms.
10. The implementation, examples, and documentation agree on every remediation and exemption.

## Non-goals

- Permitting inline raw object types.
- Treating line count as depth or conceptual value.
- Treating every export as a justified public seam.
- Automatically accepting agent-authored prose as proof.
- Banning legitimate commands, events, errors, wire formats, recursive data, or independently
  evolving boundary representations.
- Introducing a second execution convention beside the existing check and derivation engine.
