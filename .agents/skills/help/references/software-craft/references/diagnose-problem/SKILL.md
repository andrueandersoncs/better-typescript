---
name: diagnose-problem
description: Find and fix the root cause of a reproducible software failure using a tight red-capable feedback loop. Use for bugs, failing tests or builds, regressions, hangs, flaky behavior, integration failures, or unexplained slowness.
---

# Diagnose Problem

## Inputs

The reported failure, affected software boundary, expected behavior, available reproduction evidence, and relevant repository context.

## Method

1. Stop unrelated implementation and preserve the original evidence. Redact secrets from logs and reports.
2. Build one fast, deterministic command or runtime scenario that can visibly fail for the reported problem. Do not propose a fix before this loop can go red.
3. Reproduce, then minimize the inputs, state, timing, environment, and affected layer.
4. Trace the bad value or control decision backward across component boundaries. Compare with a complete nearby working path.
5. State a short ranked set of falsifiable root-cause hypotheses. Test one variable at a time and record the result.
6. Add temporary instrumentation only where it distinguishes hypotheses. Tag and remove it after diagnosis.
7. Capture the minimal reproduction as a behavior-level regression test when practical and warranted.
8. Fix the earliest verified cause, not the last visible symptom. Run the focused loop, surrounding checks, and original end-to-end scenario; use [verify-change](../verify-change/SKILL.md) for claim-specific proof of that result.
9. After three failed fixes, stop changing symptoms and question the architecture, contract, or reproduction model.

## Output

A verified root-cause fix, causal explanation, original-scenario result, and meaningful regression guard when warranted.

## Done

The original failure no longer reproduces and the causal explanation fits the evidence. When practical and warranted, a meaningful red/green guard detects recurrence; otherwise, record why no durable guard was retained and the exact original-scenario evidence.