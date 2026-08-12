# 01 — Report escaped raw result objects

**What to build:** Report a local raw object alias that escapes unchanged through a return, while
preserving the foreign-library adapter boundary when the result cannot be project-owned Schema data.
Leave the Codex OAuth result adapter in its preferred, clean form.

**Blocked by:** None — can start immediately.

**Status:** ready-for-agent

- [ ] A focused CLI fixture reports the escaped raw-result shape and remains clean for its
      foreign-adapter boundary.
- [ ] The default policy fleet and every self-hosted package enable the policy, and the Codex OAuth
      adapter passes self-hosting.
