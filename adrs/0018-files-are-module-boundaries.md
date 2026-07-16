# ADR-0018: Files are module boundaries

## Status

Accepted

## Date

2026-07-16

## Context

ADR-0014 removed `prefer-dedicated-data-structure-files`, the rule that forced a data structure into
its own file, because the split reduced locality. It retained `prefer-data-last-module`, which
required every data-last function to live inside the concept directory of its last parameter's
declaring file.

That retained rule keeps the removed convention alive through its enforcement mechanism:

- Its Module boundary is `path.dirname` of the declaration file. A directory is not a module in
  TypeScript: `export` and `import` bind names at file boundaries, and a directory can neither
  publish nor hide anything. The rule therefore polices a boundary the language does not have.
- Its remedy prescribed the dedicated-file layout ADR-0014 removed: move the function "beside rather
  than inside its dedicated data file". Satisfying the rule pushes each data structure back into its
  own file so that a meaningful concept directory exists around it.
- Declaring a data structure in a shallow shared file makes the constraint vacuous (almost every
  file is inside the directory), while declaring it deep makes unrelated placement a violation. The
  verdict tracks path depth, not conceptual cohesion.

The rest of the fleet already treats files as the module unit: export-surface, module-identity,
module-graph, and pass-through evidence all reason about the home file, and concept-control judges
data structures by owners and roles with no placement predicate at all.

## Decision

### Files are the module boundary

Placement judgements use the file as the module unit because the language's import/export scope is
the file. No check may force a declaration into or out of a directory, and no check may treat a
directory as an interface.

### Remove `prefer-data-last-module`

The check, its data module, its examples, its fixtures, and its test are removed rather than
weakened or aliased, matching the ADR-0014 removal discipline. Data structures may be declared
wherever their concept lives, including beside consuming behaviour or in a shared file. Data-last
signatures remain encouraged through `prefer-curried-data-last-functions` evidence and the
pipeline-hostile advice, which judge shape rather than location.

## Alternatives Considered

### Redefine the Module as the declaring file

- Pros: keeps the check while making its boundary match the language.
- Cons: requiring data-last functions in the exact declaration file is stricter than the directory
  rule and contradicts ADR-0014's finding that forced colocation splits reduce locality.
- Rejected: the fix would amplify the defect it repairs.

### Soften the hint and keep the predicate

- Pros: minimal churn and a stable check name.
- Cons: the predicate still measures directory containment; ADR-0014 already established that a
  better hint cannot repair the wrong predicate.
- Rejected: false placement certainty is worse than no placement rule.

### Demote to silent architecture evidence

- Pros: preserves the signal for aggregate advice.
- Cons: directory co-location does not prove a conceptual module; ADR-0014 rejected shared
  directories as evidence for exactly this reason.
- Rejected: it is not evidence of leverage, locality, seam placement, or testability.

## Consequences

- Data and behaviour may share a file, and helpers for one model may live in another subtree; the
  concept-control owner and role analysis decides whether the concept earns its keep.
- One fewer type-oracle check runs per traversal; the self-hosting report and benchmark budget are
  unaffected.
- ADR-0002's rule inventory and ADR-0014's retention note describe `prefer-data-last-module`
  historically; this record supersedes the retention.
