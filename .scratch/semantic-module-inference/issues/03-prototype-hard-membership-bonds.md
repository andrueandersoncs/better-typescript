# Prototype hard Semantic Module bonds

Type: prototype Status: resolved Blocked by: 01

## Question

Which TypeChecker-resolved AST relationships are sufficient hard evidence that two Code Entities
belong in one Semantic Module, rather than merely depending on one another? Compare candidate rule
sets on small expected-partition fixtures and link the rough prototype as the resolution asset.

## Comments

- Prototype asset: branch `prototype/semantic-module-bonds`, commit `4c5d3d633`. Run
  `bun run prototype:semantic-module-bonds`; `--report` prints the comparison matrix.

## Answer

The only neutral Hard Bond is ownership of the same canonical, non-alias TypeChecker symbol.

- Index every normalized Code Entity by each checker symbol it owns. For every symbol with two or
  more distinct eligible owners, emit deterministic pairwise candidate bonds. Overload declarations
  and binding leaves already normalized into one entity do not create self-bonds.
- Resolve aliases only to find the declaration-owning symbol. Import and export aliases never own an
  entity or create a bond.
- Apply the rule uniformly to legal same-symbol declaration contributions: repeated declarations,
  same-name type/value declarations, and function, class, or enum namespace augmentations.
- Apply eligibility and Partition Barriers first. A same-symbol candidate crossing a barrier is
  suppressed evidence and never participates in closure.
- Every other resolved relationship is dependency evidence only: calls, construction, type use,
  inheritance, implementation, decorators, initializers, one-way references, and mutual or
  transitive reference cycles.

The prototype's six provisional partition fixtures all pass with this rule. Adding reference cycles
over-groups both recursion fixtures; adding all references also over-groups ordinary and cross-file
dependencies.

Ordinary ES modules expose no neutral cross-file Hard Bond. Detecting a split Semantic Module across
files therefore requires an explicit paradigm-specific Hard Bond policy rather than a broader
neutral rule.
