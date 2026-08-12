# 01 — Report local raw object declarations

**What to build:** Report a non-empty function-local raw object declaration whether or not its
binding is returned, while preserving direct contextually typed foreign-library adapter returns.
Leave the Codex OAuth result adapter in its preferred, clean form.

**Blocked by:** None — can start immediately.

**Status:** ready-for-agent

- [x] A focused CLI fixture reports the local raw-object declaration and remains clean for its
      foreign-adapter boundary.
- [x] The default policy fleet and every self-hosted package enable the policy, and the Codex OAuth
      adapter passes self-hosting.
