---
name: verify-change
description: Prove a software claim with fresh claim-specific evidence from commands, runtime behavior, or revision-scoped artifact inspection. Use before saying fixed, complete, passing, ready, deployed, or equivalent; before integration; and after delegated work.
---

# Verify Change

## Inputs

The exact software claim, candidate artifact or runtime surface, authoritative evidence source, and relevant integration constraints.

## Method

1. State the exact claim and the observation that would prove it.
2. Select the narrowest authoritative evidence source, then include surrounding checks needed to catch integration breakage.
3. Obtain fresh evidence for the exact claim:
   - for an artifact claim, inspect the revision-scoped artifact when that inspection is authoritative;
   - for a behavioral claim, run the command or scenario fresh and read the complete relevant output, exit status, failure count, and produced artifact.
4. For behavioral claims, verify the changed surface itself:
   - web UI: run it, exercise the path, inspect console/network/accessibility, and compare the rendered result;
   - CLI/TUI: launch the program and exercise input/output/state;
   - service/API: call the real boundary and inspect response plus side effects;
   - migration/release: inspect the deployed or transformed state.
5. A regression claim requires evidence that the guard detects the broken behavior and passes with the fix.
6. Compare results with the claim. Report **failure** only for an observed contradiction. Report **unverified/incomplete** when an observation is missing, naming the missing observation and limiting the claim.
7. Preserve durable constraints or regression guards only when they defend a plausible future break.

## Output

A claim-specific **pass**, **failure**, or **unverified/incomplete** result tied to fresh command output, direct runtime observation, or authoritative revision-scoped artifact inspection. An unverified/incomplete result names the missing observation and limit on the claim.

## Done

A pass or completion statement cites fresh, claim-matched evidence—complete command output, direct real-surface observation for behavioral claims, or revision-scoped artifact inspection authoritative for an artifact claim—not a nearby proxy.

## Reuse boundary

Use this as a standalone workflow when proof is the requested outcome without a code change. Implementation, diagnosis, review, security, research, coordination, and shipping may reuse its claim-to-observation method as context while retaining their own outcomes and surface-specific gates.