# 03 — Enforce Config-backed environment reads

**What to build:** Report production `process.env` reads in unclassified Physical Modules and make
Codex home configuration injectable through Effect Config, without changing the separate test-source
policy.

**Blocked by:** None — can start immediately.

**Status:** done

- [x] Focused CLI fixtures report the unclassified production read and retain the legitimate
      boundary.
- [x] The default policy fleet and every self-hosted package enable the policy, and Codex OAuth
      configuration passes self-hosting without global environment mutation.

## Comments

### 2026-08-13 — Verified complete

The implementation, focused policy fixtures, public report assertions, self-host wiring, and Codex
workflow behavior satisfy both acceptance items. Verification passed: 9 focused tests, 691
full-suite tests, an empty `bun run dev` report, and a 66.079ms benchmark.
