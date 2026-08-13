# 04 — Report linear imperative Effect pipelines

**What to build:** Report straight-line, single-use Effect transformations that can be expressed as
one data-last pipeline, including the Codex OAuth resolve path, while retaining non-linear workflows
and reused intermediate values.

**Blocked by:** None — can start immediately.

**Status:** done

- [x] Focused CLI fixtures report the linear chain and retain a non-linear or reused-value boundary.
- [x] The default policy fleet and every self-hosted package enable the policy, and Codex OAuth uses
      its standalone preferred pipeline form.

## Comments

### 2026-08-13 — Verified complete

The implementation, focused policy fixtures, public report assertions, self-host wiring, and Codex
workflow behavior satisfy both acceptance items. Verification passed: 9 focused tests, 691
full-suite tests, an empty `bun run dev` report, and a 66.079ms benchmark.
