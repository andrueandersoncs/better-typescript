# Specify the validation oracle

Type: grilling Status: resolved Blocked by: 04, 06, 07

## Question

Which fixture matrix, human-authored expected partitions, metamorphic invariants, mismatch outputs,
self-host expectations, and benchmark measurements are sufficient to prove the specified behavior
and the existing sub-100ms requirement?

## Answer

Use a layered, human-authored oracle. Generated expected output is forbidden.

`tests/fixtures/semantic-modules/` contains orthogonal Programs and one composite end-to-end
Program. Each fixture has an external typed manifest. Its labels select entities by fixture-relative
path, declaration kind, display name, and occurrence. The harness must prove that every selector
resolves exactly once and every observed entity has exactly one label before translating labels to
runtime EntityKeys.

Matcher-side tests prove:

- every settled declaration family, one- and multi-leaf binding, overload, legal merge contribution,
  repeated and dotted namespace, named and anonymous default, and alias rule;
- `ambient-declaration` and `missing-symbol` exclusions, with the latter exercised by an isolated
  parser-recovery Program outside the diagnostic-clean fixture set;
- singleton membership, same-symbol bonds, duplicate coalescing, a redundant-bond triangle and its
  canonical forest, production/test suppression, excluded-source absence, Program isolation, and the
  non-bonding of ordinary dependencies and reference cycles;
- exact `SemanticModuleSnapshotV1` JSON for focused contract cases, including keys, anchors, strata,
  collections, evidence, exclusions, and every canonical order;
- `moduleFor` and `peersFor` completeness, plus self, forward, reverse, cross-module, and
  unknown-key `proofBetween` results.

Guidance-side tests prove clean, split-only, mixed-only, overlapping split-and-mixed, multiple
splits sharing one anchor, canonical ordering, and exact deduplication. For each mismatch, assert
the full typed Detection projection: tag, location, message, hint, complete ordered membership,
Physical Module paths, forest bonds, evidence keys, and count. Assert the full structured Advice,
including title, location, explanation, evidence counts, entity rows, grouping, and
mixed-before-split order. One composite test runs Program through matcher, silent Signal, adviser,
and normalized renderer; its exact report contains no raw `semantic-module-placement` block.

Metamorphic tests have two classes:

- Byte identity: permute source-file, normalized-entity, rule-registration, and candidate-emission
  enumeration and repeat exact candidate emissions. Snapshot JSON, pure query results, projections,
  and Advice remain identical. The private partition implementation may expose an internal test seam
  for otherwise unobservable enumeration permutations; it must not enlarge the public interface.
- Label-remapped equivalence: rename display names, insert whitespace or comments, and relocate
  declarations between eligible files in one stratum. Membership and proof rule/evidence structure
  remain equivalent after remapping labels; only keys, anchors, paths, canonical order induced by
  those keys, and consequent placement mismatches may change.

Controlled-change cases require exact deltas: moving one endpoint across production/test suppresses
its bond and splits the component; changing only Physical Module placement changes only the expected
placement projections; adding one-way or cyclic dependency references does not change membership.

Implementation proof is:

1. The focused Semantic Module test files and then `bun run test` pass.
2. `bun run dev` emits no Check or Advice, with `semanticModulePlacement` enabled for config, every
   package source, and tests through Architecture Explore Wiring. No baseline or allowlist is valid.
3. The benchmark enrollment test names `semantic-module-placement`.
4. `bun run bench` measures the existing warmed, merged default plus Architecture Explore report and
   reports a mean strictly below 100ms. Record the observed mean; no microbenchmark or relative
   baseline substitutes for this gate.
