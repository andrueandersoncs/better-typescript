# 03 — Enforce Config-backed environment reads

**What to build:** Report production `process.env` reads in unclassified Physical Modules and make
Codex home configuration injectable through Effect Config, without changing the separate test-source
policy.

**Blocked by:** None — can start immediately.

**Status:** ready-for-agent

- [ ] Focused CLI fixtures report the unclassified production read and retain the legitimate
      boundary.
- [ ] The default policy fleet and every self-hosted package enable the policy, and Codex OAuth
      configuration passes self-hosting without global environment mutation.
