---
name: evaluate-agents
description: Evaluate deployed agent behavior with held-out tasks, verifiers, calibrated judges, and release criteria.
---

# Evaluate Agents

Evaluate the deployed system: model, context, tools, environment, and harness. Every evaluation must support a concrete decision.

## Method

1. Use [verify-change's method](../../../software-craft/references/verify-change/SKILL.md#method) to define each claim, its authoritative observation, and the pass, failure, or incomplete result.
2. Build tasks from production failures and real business distributions. Apply the shared [behavioral comparison method](references/comparison-method.md) for versioning, fixtures, development/acceptance separation, matched runs, and selection; keep this evaluation's system variants and outcomes.
3. Specify the environment's interaction protocol, termination rules, and state transitions; preserve hidden state, tests, and reference solutions on the verifier side.
4. Prefer deterministic verifiers for outcome claims.
5. Use a rubric and calibrated model judge only for qualities that rules cannot settle. Require evidence per dimension and include human gold cases.
6. Measure capability and reliability separately:
   - `pass@k` or best-of-k for reachable capability.
   - `pass^k`, the probability that all k attempts succeed, for reliability.
7. Attribute each failure to the first erroneous decision and its layer. Preserve the trajectory prefix that exposes the decision boundary.
8. Use the comparison method to compare model swaps or harness ablations and report task success, p95 latency, token and dollar cost per successful task, and safety guardrails.

## Evaluation discipline

- Test both the failure boundary and a retention set of behavior that already works.
- Calibrate pairwise judges in both presentation orders.
- Use heterogeneous evidence or judges for important subjective decisions.
- Treat every score as a proxy under Goodhart's Law. Inspect how the system can satisfy the metric while missing the user's intent.
- Change one meaningful variable per experiment.

Source: *Building AI Agents*, Chapter 7, “Agent Evaluation.”
