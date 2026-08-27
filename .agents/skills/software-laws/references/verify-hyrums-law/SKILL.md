---
name: verify-hyrums-law
description: "Informally assesses whether Hyrum's Law is supported in a concrete project or decision using API behavior and consumer-dependency evidence. Use when asked to verify, test, assess, investigate, or apply Hyrum's Law."
---

# Informally Verify Hyrum's Law

Read the law's exact wording and context in [`../reference.md`](../reference.md), then follow the shared [`informal-verification` method](../informal-verification.md).

## Investigation

> List observable but undocumented behavior in a widely used API. Search consumer code, tests, issues, and regressions for dependencies on it. Where safe, change a behavior in a sandbox and observe breakages.

