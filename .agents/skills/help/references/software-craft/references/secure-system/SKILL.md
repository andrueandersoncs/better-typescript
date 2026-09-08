---
name: secure-system
description: Threat-model and harden software that crosses trust, authorization, privacy, dependency, secret, or AI-tool boundaries. Use for authentication, untrusted input, uploads, webhooks, payments, sensitive data, external integrations, dependencies, deployment credentials, or model-driven actions.
---

# Secure System


For an infrastructure, CI, or executable-skill supply-chain assessment, read [infrastructure supply-chain audit](references/infrastructure-supply-chain-audit.md). In assessment-only work, inspect existing controls and recommend changes; do not implement controls or run live abuse probes without authorization.

## Inputs

The software boundary, assets and actors, privileged actions, data classes, concrete abuse outcomes, and applicable operational constraints.

## Method

1. Map assets, actors, entry points, trust boundaries, data classes, and privileged actions. State the concrete abuse outcomes that matter.
2. Trace each abuse path through authentication, authorization, input handling, storage, output, network access, and operational controls.
3. Put validation and authorization at the owning external boundary. Use parameterized queries, contextual output encoding, bounded uploads, safe URL policy, rate limits, and explicit session rules where applicable.
4. Keep secrets in protected stores and out of source, logs, browser bundles, prompts, artifacts, and screenshots. Audit the authoritative package and deployment boundary.
5. Review dependency reachability, install scripts, lockfiles, provenance, and runtime exposure rather than treating advisory count as risk.
6. Minimize personal data, define purpose and retention, restrict access, and make deletion/export obligations executable.
7. For model-driven systems, treat retrieved content and model output as untrusted; constrain tools, arguments, permissions, side effects, and confirmation boundaries.
8. Use [verify-change](../verify-change/SKILL.md) to match each high-consequence security claim to an authoritative observation, then test the real abuse paths through the real boundary. Inspect audit events, headers, limits, permission failures, and secret absence.

## Output

A threat model, correctly placed preventive or detective controls, and real-boundary evidence for the highest-consequence abuse paths. For assessment-only work, deliver a report that separates observed controls, unverified runtime controls, and recommendations; do not represent a recommendation as installed or proven.

## Done

For implementation work, each material threat has a preventive or detective control at the correct boundary, and the highest-risk controls are demonstrated rather than assumed. For assessment-only work, each material finding records its evidence, reachable impact, relevant controls or counterevidence, and verification status; implementation remains separately authorized.