# 02 — Report trivial named Effect wrappers

**What to build:** Report a named `Effect.fn` generator that only forwards its parameters into one
Effect and yields its result, while retaining meaningful named workflows that transform, recover,
sequence, or otherwise add behavior.

**Blocked by:** None — can start immediately.

**Status:** ready-for-agent

- [ ] Focused CLI fixtures report the trivial forwarding wrapper and retain a meaningful workflow
      boundary.
- [ ] The default policy fleet and every self-hosted package enable the policy, and the Codex OAuth
      decoder passes self-hosting.
