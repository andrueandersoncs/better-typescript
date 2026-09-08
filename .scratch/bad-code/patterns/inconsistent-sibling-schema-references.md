# Inconsistent sibling schema references

- Status: prospective
- Status-source: agent
- Rule candidate: none
- Created: 2026-09-08
- Updated: 2026-09-08

## Invariant

Within one declarative RPC family, use one schema-reference syntax for each repeated slot. Name schema bindings consistently and use either standalone identifiers or one stable member path for corresponding `payload`, `success`, and `error` values. Different syntax remains allowed when a slot accepts categorically different value kinds or the declarations are not one named family.

## Detection

Find sibling `Rpc.make` calls in one lexical scope whose string-literal names share the prefix before the final dot and whose object arguments repeat a property. Use the checker to require schema-valued initializers. Normalize each initializer by identifier naming form or property-access path, then report a repeated property whose family mixes those forms.

## Evidence

- Snippets:
  - [012](../snippets/012-inconsistent-rpc-schema-references.md)
- Allowed nearby:
  - Unrelated RPC declarations without a shared name prefix
  - A repeated slot whose contract intentionally accepts categorically different value kinds

## Overlap

`schema-name-suffix` checks individual schema-valued `const` names but does not compare sibling object properties or member paths. `no-property-access-after-call` only owns property access from a call result. No built-in rule owns cross-declaration schema-reference consistency.

## Decision

- 2026-09-08: Prospective from one snippet; the family boundary, detection, and replacement are clear, but independent evidence is still required.
