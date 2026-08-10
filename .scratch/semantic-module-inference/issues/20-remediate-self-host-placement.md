# 20 — Remediate self-host Semantic Module placement

**Specification:** [Semantic Module inference](../spec.md)

**What to build:** Apply the completed placement analysis to this repository until every configured
source satisfies its inferred Semantic Module partition without suppressions or layout-derived
bonds.

**Blocked by:** 16 — Render Semantic Module placement Advice; 19 — Infer neutral Semantic Reference
Graph Hard Bonds.

**Status:** done

- [x] Run the complete self-host Wiring over configuration, every package source, and tests after
      the neutral reference-graph rules land; capture the exact remaining split and mixed Advice.
- [x] Resolve every mismatch by relocating complete Semantic Modules. Never split membership, infer
      a destination from a reporting anchor, or encode current paths/co-location into a Hard Bond
      rule.
- [x] Preserve runtime behavior, TypeScript semantics, package exports, and public interfaces.
      Update every import/reference with language-server refactors where available.
- [x] Keep this placement-only: do not inline, delete, merge, or otherwise reduce Code Entities
      merely to silence Advice.
- [x] Add no allowlist, baseline, suppression, ignored self-host path, score, threshold, or
      repository-specific paradigm rule.
- [x] Self-host output is empty with the placement Policy and adviser enabled exactly once in every
      Architecture Explore preset.
- [x] Focused Semantic Module tests and the full suite pass; formatting is clean; the warmed
      benchmark records its observed mean strictly below 100ms.

## Answer

The restored self-host Wiring surfaced seven placement findings. Each was remediated by relocating
complete Semantic Modules, never by splitting membership or suppressing output:

- `detectionEquals` and `detectionsEquivalence` to
  `packages/core/src/engine/location/detectionData.ts`
- `signalEquals` and `signalArrayEquivalence` to `packages/core/src/engine/signal/data.ts`
- `wiringSignalsEquals` and `wiringSignalsArrayEquivalence` to
  `packages/core/src/engine/signal/wiringSignals.ts`
- `DataStructureEntry` into `packages/matchers/src/builtins/conceptControl/conceptControlEngine.ts`
- `allowedTargetRoles` and `canImportRole` into
  `packages/matchers/src/support/architectureRoleType.ts`

`packages/core/src/engine/signal/detectionEquals.ts`,
`packages/matchers/src/builtins/conceptControl/dataStructureEntry.ts`, and
`packages/matchers/src/builtins/functionalCoreEffect/allowedTargetRoles.ts` are gone along with the
stale `./engine/signal/detectionEquals` package export. `selfHostPlacementWiring.ts` enrolls the
placement Policy exactly once. `bun run dev` reports nothing, the full suite passes, formatting is
clean, and the warmed benchmark mean is 68.9ms.
