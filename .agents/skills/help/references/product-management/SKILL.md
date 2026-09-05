---
name: product-management
description: Define or assess product needs, capabilities, journeys, releases, and AI opportunities through evidence-backed records.
metadata:
  internal: true
---

# Product Management

Create the smallest complete product record that explains who needs the product, why it exists, how it behaves, what constrains it, how success is measured, where it ships, and what evidence supports it. Read the focused reference that matches the task:

- [Product catalog](references/catalog.md) for scope, taxonomy, hierarchy, evidence, metadata, and a worked example
- [Feature specifications](references/specifications.md) for reusable rules, states, permissions, quality requirements, and analytics contracts
- [Question model](references/question-model.md) for answer coherence, uncertainty, relationships, time, product claims, and completeness dimensions
- [Platform design](references/platform.md) for product-platform capabilities, control-plane scope, architecture, and progressive construction
- [AI opportunity assessment](references/ai-opportunity-assessment.md) for turning discovery evidence into a prioritized AI, automation, and process-improvement decision document

## Core Model

Keep these layers distinct and linked:

- **Product truth:** durable capabilities, features, journeys, rules, permissions, data, interfaces, quality requirements, and analytics.
- **Change intent:** initiatives, requirements, stories, tasks, releases, flags, and rollout plans.
- **Evidence and operations:** research, feedback, metrics, experiments, decisions, service objectives, incidents, and support procedures.

A capability is a durable customer or business ability. A feature is a product mechanism that provides that ability. A story or task is a planned slice of change. Never use one object for all three.

Product claims and their evidence remain here. Use [define-work](../software-craft/references/define-work/SKILL.md) only to resolve an unaccepted software outcome, or [design-contract](../software-craft/references/design-contract/SKILL.md) for a requested implementation-facing seam. Link the resulting contract back; planned behavior is not implemented truth.

## Method

1. Establish the actor or segment, their problem or job, the supporting raw evidence, and the desired outcome with a measurable metric.
2. Place the scope in `Product → Product Area → Capability → Feature`. Attach journeys or use cases where behavior crosses features.
3. Specify the behavior needed for the request. Use relevant functional requirements, acceptance criteria, reusable business rules, state transitions, roles, entitlements, eligibility, feature flags, experience, data, interfaces, measurable nonfunctional requirements, analytics contracts, and tests.
4. Maintain traceability from persona and problem through outcome, initiative, capability, feature, requirement, acceptance evidence, release, and observed results.
5. Keep delivery work separate from durable product truth. A ticket may close; the current product behavior must remain discoverable.
6. Record decisions, assumptions, dependencies, lifecycle status, ownership, source evidence, and last-validated date on the objects they govern.
7. After release, compare observed metrics and feedback with the intended outcome, then update the product truth and lifecycle state.

## Output

Use the repository's existing product artifacts and naming. Otherwise return one concise document containing only relevant sections from:

- Scope, owner, and lifecycle
- Customer, problem, and evidence
- Desired outcome and metric
- Product area, capability, feature, and journey
- Behavior, constraints, acceptance, and measurement
- Delivery and release
- Decisions, assumptions, dependencies, and traceability

Label assumptions and unknowns. Keep raw evidence, interpretations, problems, and decisions distinct. Omit empty sections and taxonomy that does not help the requested decision.