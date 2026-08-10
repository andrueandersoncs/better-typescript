# 17 — Enable and prove Semantic Module analysis in self-hosting

**Specification:** [Semantic Module inference](../spec.md)

**What to build:** Enable the complete placement Policy and adviser in every Architecture Explore
preset and prove the shipped feature through the repository's full validation and performance gates.

**Blocked by:** 16 — Render Semantic Module placement Advice; 19 — Infer neutral reference-graph
Hard Bonds; 20 — Remediate self-host placement Advice.

**Status:** done

- [x] Neutral, object-oriented, and functional presets each own an explicit immutable paradigm Hard
      Bond catalog. Neutral contains exactly the settled reference-cycle, subject-ownership, and
      exclusive-ownership rules; object-oriented and functional remain empty. Every preset
      instantiates one placement Policy.
- [x] Combined Architecture Explore presets inherit the union of constituent catalogs without
      duplicate Policy names or duplicate snapshot construction.
- [x] Every Architecture Explore preset includes the placement adviser; baseline default Wiring
      remains unchanged.
- [x] Self-host configuration enables the complete path for configuration, every package source, and
      tests with no allowlist or baseline suppression.
- [x] The benchmark enrollment test names `semantic-module-placement` and all enrollment counts are
      updated intentionally.
- [x] Focused Semantic Module tests and the full test suite pass.
- [x] Formatting is clean and self-hosting emits no Check, Advice, or architecture remediation.
- [x] The existing warmed merged default-plus-Architecture-Explore benchmark records its observed
      mean and remains strictly below 100ms.

## Answer

`better-typescript.config.ts` pairs the reporting product Wiring with `selfHostPlacementWiring.ts`,
which enrolls `semantic-module-placement` once over configuration, every package source, and tests,
and derives only its own placement Advice. The enrollment count is asserted in
`tests/selfHostBenchmark.test.ts` (85 checks, placement silent, one policy per wiring).
`bun run dev` emits nothing, the full suite passes, and the warmed benchmark mean is 69.1ms.
