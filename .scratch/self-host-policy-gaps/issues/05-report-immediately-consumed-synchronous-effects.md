# 05 — Report immediately consumed synchronous Effects

**What to build:** Report a locally bound `Effect.sync` that is immediately consumed by
`Effect.runSync`, while retaining deferred and independently composed synchronous Effects. Remove
the redundant Codex OAuth provider-registration wrapper.

**Blocked by:** None — can start immediately.

**Status:** done

- [x] Focused CLI fixtures report the immediate synchronous pair and retain a deferred or composed
      Effect.
- [x] The default policy fleet and every self-hosted package enable the policy, and the self-host
      report is empty after the Codex OAuth cleanup.

## Comments

### 2026-08-13 — Verified complete

The implementation, focused policy fixtures, public report assertions, self-host wiring, and Codex
workflow behavior satisfy both acceptance items. Verification passed: 9 focused tests, 691
full-suite tests, an empty `bun run dev` report, and a 66.079ms benchmark.
