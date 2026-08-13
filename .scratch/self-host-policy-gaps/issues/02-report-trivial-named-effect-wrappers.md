# 02 — Report trivial named Effect wrappers

**What to build:** Report a named `Effect.fn` generator that only forwards its parameters into one
Effect and yields its result, while retaining meaningful named workflows that transform, recover,
sequence, or otherwise add behavior.

**Blocked by:** None — can start immediately.

**Status:** done

- [x] Focused CLI fixtures report the trivial forwarding wrapper and retain a meaningful workflow
      boundary.
- [x] The default policy fleet and every self-hosted package enable the policy, and the Codex OAuth
      decoder passes self-hosting.

## Comments

### 2026-08-13 — Verified complete

The implementation, focused policy fixtures, public report assertions, self-host wiring, and Codex
workflow behavior satisfy both acceptance items. Verification passed: 9 focused tests, 691
full-suite tests, an empty `bun run dev` report, and a 66.079ms benchmark.
