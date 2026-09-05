# Product Question Model

Read this when checking completeness, reconciling conflicting answers, or deciding which questions a product change must answer.

Product management is fundamentally an **answer-coherence discipline**.

A product manager is not primarily managing stories, roadmaps, requirements, or releases. Those are representations. The deeper job is to maintain coherent, current answers to a recurring set of questions:

- **Why** should this exist?
- **Who** is it for?
- **What** problem does it solve?
- **What** should the product do?
- **How** should it behave?
- **Under what rules and constraints**?
- **How well** must it perform?
- **How do we know** it is correct or valuable?
- **When and where** is it available?
- **Who owns or decides**?
- **What evidence supports the answer?**
- **What changed, and why?**

This suggests a powerful product-platform thesis:

> **Artifacts are not the product model. Artifacts are views generated from the product model.**

A PRD, roadmap, user story, permission matrix, release note, API specification, support article, and test plan are all different projections of the same underlying body of product knowledge.

An all-encompassing platform should therefore be organized around **questions, answers, relationships, evidence, and time**, rather than around documents and tickets.

## Organizational Knowledge Management

The organization needs shared answers about customers, problems, behavior, constraints, decisions, and outcomes.

But these answers are currently scattered across:

- Ticket trackers
- Documents
- Whiteboards
- Design files
- Source code
- Analytics tools
- Slack conversations
- Support systems
- CRM records
- People’s memories

Most product-management friction is not caused by an absolute lack of information. It is caused by one of the following:

- The answer cannot be found.
- Multiple incompatible answers exist.
- The answer is stale.
- The answer has no owner.
- Nobody knows whether it is a fact, assumption, proposal, or decision.
- The answer applies only to certain plans, regions, platforms, or versions.
- The evidence behind the answer has been lost.
- A change was made without updating dependent answers.

The platform opportunity is not merely to store more information. It is to make the organization’s product knowledge **addressable, governable, and computable**.

## Decision-Making Under Uncertainty

Many product questions do not initially have factual answers.

For example:

- Which customer problem matters most?
- Which workflow will users prefer?
- Will this improve retention?
- What performance threshold is sufficient?
- Should the feature be included in the Pro plan?
- Will customers understand this terminology?

The answers may begin as:

- Observations
- Assumptions
- Hypotheses
- Preferences
- Proposals
- Decisions

Later, they may become:

- Validated findings
- Approved policies
- Implemented behavior
- Measured results
- Superseded decisions

That means a product platform needs to represent the **epistemic status** of an answer—what kind of knowledge it is.

A statement such as:

> “Users need bulk export.”

could mean several very different things:

| Status | Actual meaning |
|---|---|
| Observation | Three interviewees asked for bulk export. |
| Assumption | We believe larger customers need bulk export. |
| Hypothesis | Bulk export will increase enterprise conversion. |
| Decision | We have decided to build bulk export. |
| Requirement | Enterprise administrators must be able to export all records. |
| Implemented fact | Bulk export is available in version 4.2. |
| Measured result | Customers using bulk export renew at a higher rate. |

Most tools store all of these as undifferentiated text. A better platform should treat them as distinct objects or states.

## Relational, Not Hierarchical

Traditional tools impose a hierarchy:

```text
Initiative
└── Epic
    └── Story
        └── Task
```

That hierarchy is useful for work decomposition, but it is a poor model of a product.

A business rule may apply to twelve features. A metric may measure three journeys. A customer problem may motivate several capabilities. One API may support many experiences. A feature may belong to one product area but depend on four others.

The actual product looks more like a graph:

```text
Customer segment ── experiences ──> Problem
Problem ── motivates ──> Outcome
Outcome ── measured by ──> Metric
Capability ── addresses ──> Problem
Feature ── implements ──> Capability
Feature ── constrained by ──> Business rule
Feature ── available through ──> Plan
Feature ── manipulates ──> Data entity
Feature ── exposed through ──> API
Requirement ── verified by ──> Test
Decision ── supported by ──> Evidence
Feature ── introduced in ──> Release
```

Use a **product knowledge graph** as the canonical model, while allowing users to navigate it through familiar documents, lists, matrices, roadmaps, and boards.

The graph is the underlying model. The document is just a view.

## Temporal

Product answers are almost never universally true forever.

Consider:

> “Administrators can export audit logs.”

Important qualifiers may include:

- Starting in version 4.2
- Only on Enterprise plans
- Only in the web application
- Not in the EU region until data residency work is complete
- Limited to 90 days before version 4.5
- Available to owners as well as administrators after a later policy change

A platform therefore needs to answer not only:

> What is true?

but also:

> What was true at a particular time, and what is proposed to become true?

There are at least three useful temporal views:

### Current Product

What customers can use now.

### Historical Product

What a particular customer, version, release, or contract received at a specific time.

### Planned Product

What the organization intends to make true in the future.

Conventional product tools routinely mix these together. A planned story appears next to an implemented requirement; a deprecated behavior remains in a PRD; an old design still looks authoritative.

A comprehensive platform should model validity explicitly:

```text
Proposed → Approved → In Development → Released → Deprecated → Retired
```

It should also maintain effective dates, applicable releases, and supersession relationships.

## Continuous Control Loop

The recurring product questions form a loop rather than a linear delivery process:

```text
Observe
   ↓
Understand the customer and problem
   ↓
Choose an outcome
   ↓
Design product behavior
   ↓
Build and release
   ↓
Observe actual behavior and outcomes
   ↓
Revise the understanding, decision, or product
```

This means the platform should connect:

- Evidence to problems
- Problems to outcomes
- Outcomes to product changes
- Product changes to implementations
- Implementations to releases
- Releases to telemetry
- Telemetry back to evidence and decisions

Most current systems stop at “released.” But release is the midpoint of the product loop, not the endpoint.

A completed story answers:

> Did we finish the planned work?

Product management ultimately needs to answer:

> Did the product now behave as intended, and did that produce the expected outcome?

## Reconciliation of Three Products

Every organization effectively has three versions of its product.

### Intended Product

What strategy, requirements, designs, policies, and decisions say should exist.

### Implemented Product

What the code, configuration, feature flags, APIs, infrastructure, and data schemas actually provide.

### Experienced Product

What users actually encounter, as reflected in telemetry, support cases, feedback, incidents, accessibility issues, and performance.

These three versions often diverge.

Examples:

- The requirement says an invitation expires after seven days, but the backend uses fourteen.
- The pricing page says a feature is available on Pro, while entitlement configuration limits it to Enterprise.
- The design includes an error-recovery flow that was never implemented.
- The feature works technically, but customers cannot discover it.
- The analytics event fires before the operation succeeds, inflating usage figures.

An advanced product platform can become the reconciliation layer among these realities.

It should not pretend there is one simplistic “single source of truth.” Instead, it should identify:

- The authoritative source for intended behavior
- The authoritative source for implemented behavior
- The authoritative source for observed behavior
- Divergence among them

That is much more valuable than merely centralizing documents.

## Product Claims

A claim could have this general structure:

```text
Subject
+ Relationship or question
+ Answer
+ Scope
+ Conditions
+ Status
+ Evidence
+ Owner
+ Validity period
```

For example:

```text
Subject: Project deletion
Question: Who may perform it?
Answer: Organization owner
Scope: Team and Enterprise plans
Condition: Project has no active deployment
Status: Approved and implemented
Valid from: Version 5.3
Owner: Workspace Administration
Evidence: Decision D-184, authorization tests, API policy
```

From that one structured answer, the platform could contribute to:

- A permissions matrix
- A user story
- API authorization documentation
- Acceptance tests
- Help-center content
- An administrator guide
- A security review
- A release note
- An impact analysis

This greatly reduces repeated, inconsistent prose.

## Universal Question Model

Product questions can be collapsed into a relatively stable set of dimensions.

| Dimension | Representative questions |
|---|---|
| Context | Where does it belong? Which product, area, platform, or market? |
| Purpose | Why does it exist? What problem or opportunity does it address? |
| Audience | Who needs it? Who is affected? |
| Outcome | What change should it produce? |
| Behavior | What can users or systems do? What happens in each situation? |
| Rules | What conditions, calculations, permissions, or policies apply? |
| Experience | How does someone interact with it across a journey? |
| Information | What data does it use, produce, retain, or expose? |
| Interfaces | How does it communicate with other systems? |
| Quality | How fast, reliable, secure, accessible, or scalable must it be? |
| Commercial scope | Which plans, contracts, regions, or customer types receive it? |
| Delivery | When and how will it become available? |
| Verification | How do we know it was built correctly? |
| Measurement | How do we know it created value? |
| Evidence | What supports the problem, decision, or conclusion? |
| Governance | Who owns, approves, or may change it? |
| Risk | What could fail, block, or produce harm? |
| Lifecycle | Is it proposed, active, deprecated, or retired? |
| Semantics | What do the terms mean? |

These dimensions can become the backbone of the platform’s ontology.
