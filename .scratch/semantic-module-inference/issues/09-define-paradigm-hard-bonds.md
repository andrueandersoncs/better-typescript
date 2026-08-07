# Define paradigm-specific Hard Bond policy

Type: grilling Status: resolved

## Question

Since neutral TypeScript Hard Bonds cannot join ordinary declarations across Physical Modules, which
explicit paradigm-specific TypeChecker-resolved relationships, if any, may contribute Hard Bonds,
and what soundness and explanation contract must each rule satisfy without introducing names, paths,
scores, or thresholds?

## Answer

The initial paradigm-specific Hard Bond catalog is empty. Canonical checker-symbol ownership remains
the only built-in Hard Bond.

A future paradigm rule may be admitted only under this contract:

- The rule belongs to a named paradigm preset and is enabled by that preset by default. Combined
  wiring inherits the union of its constituent presets; source code never auto-selects a paradigm.
- Every emitted pair must satisfy semantic necessity: under that paradigm, the two Code Entities are
  parts of one conceptual definition and separating them is a defect. Commonness is insufficient.
- Rules read only normalized Code Entities and TypeChecker-resolved facts from the current Program.
  They never consume another rule's bonds or inferred Semantic Modules.
- Deterministic closed-world premises are allowed, including exact cardinality. Weighted scores,
  confidence, configurable cutoffs, and textual names or paths as matching predicates are forbidden.
  Names and paths may remain identity, anchor, or display metadata.
- A fact involving more than two entities emits only the pairs it independently proves. The
  partition algorithm supplies transitive closure; rules do not choose an arbitrary hub.
- Every candidate bond carries replayable structured evidence: a stable rule id, canonical endpoint
  keys, the resolved semantic witnesses, every closed-world premise used, and a canonical evidence
  key derived from that content. Human explanations are rendered from this evidence rather than
  stored as an opaque assertion.

Candidate ordering, barrier classification, closure, and Membership Proof construction remain those
settled by [Specify the partition and explanation algorithm](04-specify-partition-algorithm.md).

## Comments

The empty initial catalog is superseded by
[Define the initial paradigm Hard Bond catalog](18-define-initial-hard-bond-catalog.md), which
admits two neutral rules under this evidence contract.
