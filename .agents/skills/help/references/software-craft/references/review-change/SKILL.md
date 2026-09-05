---
name: review-change
description: Independently judge a software change against its intended behavior and long-term code health. Use for pull requests, branches, significant work in progress, architecture changes, security-sensitive changes, or before integration.
---

# Review Change

## Inputs

The reviewable software artifact, originating outcome or specification, repository rules, relevant tests, and requested review boundary.

## Method

1. Pin the review boundary and read the originating outcome, spec, repository rules, and tests.
2. Use fresh context for material review. Keep two verdicts distinct:
   - **Specification:** missing behavior, wrong behavior, scope creep, compatibility, and migration completeness.
   - **Quality:** correctness, clarity, simplicity, architecture, security, performance, operability, and test strength.
3. Read tests before implementation. Ask what observable break each test would catch.
4. Identify the central fact the change's safety depends on, then trace every coupling path, not only symbol references: lifecycle and timing, wire or persisted formats, dependency semantics, feature flags, and downstream readers. Also look for partial cutovers, duplicated ownership, unreachable cleanup, and new concepts that can be deleted.
   - Inspect repeated code or structure, large data dumps embedded inline in code, and missing or incorrect abstractions as investigation cues. Report them only when evidence shows a concrete consequence under step 6; use [implement-change](../implement-change/SKILL.md) for the repetition or contract-pressure threshold and [design-contract](../design-contract/SKILL.md) for public-boundary consequences.
5. Judge domain-specific security, performance, interface, and motion concerns as part of the requested review context. For a material security, performance, or claim-to-observation concern, use [secure-system](../secure-system/SKILL.md), [optimize-system](../optimize-system/SKILL.md), or [verify-change](../verify-change/SKILL.md) as bounded context; a read-only review does not inherit a remediation deliverable.
6. Report only evidence-backed findings with severity, file location, consequence, and smallest corrective action. Keep praise and style preference out of the findings list.
7. When receiving review, verify each claim against code and contract. Clarify ambiguity and push back with evidence; do not implement feedback merely because a reviewer stated it.
8. Re-review corrected critical findings and the integrated change.

## Output

An independent specification and quality verdict with only evidence-backed findings, consequences, and smallest corrective actions.

## Done

Every blocking finding maps to an observable contract or concrete maintenance risk, and approval means both specification and quality pass.