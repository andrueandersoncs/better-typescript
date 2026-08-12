# 05 — Report immediately consumed synchronous Effects

**What to build:** Report a locally bound `Effect.sync` that is immediately consumed by
`Effect.runSync`, while retaining deferred and independently composed synchronous Effects. Remove
the redundant Codex OAuth provider-registration wrapper.

**Blocked by:** None — can start immediately.

**Status:** ready-for-agent

- [ ] Focused CLI fixtures report the immediate synchronous pair and retain a deferred or composed
      Effect.
- [ ] The default policy fleet and every self-hosted package enable the policy, and the self-host
      report is empty after the Codex OAuth cleanup.
