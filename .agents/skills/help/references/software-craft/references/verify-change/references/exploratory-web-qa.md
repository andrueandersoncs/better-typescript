# Exploratory web QA

Use this procedure when the requested outcome is a report of observed web behavior, not a repair. It supplies evidence to [Verify Change](../SKILL.md); it does not replace its claim-to-observation standard.

## Establish the boundary

1. Record target URL, inspected revision or deployment identifier when available, browser/device and viewport, session state, and date/time.
2. Treat access to a nonlocal target as permission to read it, not to submit, create, change settings, purchase, delete, or otherwise mutate it. Obtain explicit authorization before any such journey. Never obtain or expose credentials, tokens, cookies, or private session data.
3. Map only authorized journeys. For each, note entry point, expected outcome, and relevant states: loading, empty, error, stale data, and overflow or constrained viewport.

## Explore and retain evidence

1. Follow each authorized journey as a user. Capture the rendered state before and after consequential interactions and record the URL or visible state transition.
2. Exercise the mapped states where they can be reached without unauthorized mutation. Navigate back and forward, refresh at meaningful points, and check whether state, routing, and displayed data remain coherent.
3. For each visited surface, inspect evidence available through the harness: interaction result, browser console, relevant network failures or unexpected responses, and accessibility tree or semantics. Record the actual observation and source; absence of collected evidence is unverified, not clean.
4. On a suspected defect, repeat the smallest safe path. Report target/revision/environment, prerequisites, ordered steps, expected and actual result, observed evidence, and scope or impact. Redact sensitive values rather than reproducing them.
5. Close with journeys and states covered, evidence retained, findings, and explicitly untested coverage with its reason. Do not assign synthetic health scores or quotas.

## Ownership

This is report-only: do not repair code, bootstrap tools, CI, or tests, or submit findings externally without authorization. If correction work is requested, hand the evidence to the existing implementation or documentation owner; retain [Verify Change](../SKILL.md) as the proof owner.

Adapted from gstack's `qa-only/SKILL.md.tmpl` and `qa/sections/qa-patterns.md`; see [gstack source attribution](../../../../gstack-sources.md).