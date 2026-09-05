# Product Management Platform

A product platform built on structured questions, claims, and relationships can make product knowledge coherent, computable, and useful without replacing every execution tool.

## Question-Driven Completeness Analysis

Instead of asking whether a PRD has all required sections, ask whether the important product questions have trustworthy answers.

For an authentication feature, the platform might expect answers about:

- Actors and permissions
- Security requirements
- Account recovery
- Session behavior
- Failure states
- Audit events
- Privacy
- Performance
- Instrumentation
- Rollout and rollback

For a small copy change, most of those questions would be unnecessary.

Thus completeness should be **contextual and risk-based**, not a giant universal form.

A platform could show:

```text
Purpose                  Answered
Target customer          Answered
Primary workflow         Answered
Permission rules         Conflicting answers
Failure recovery         Missing
Accessibility            Missing
Analytics                Stale
Rollout plan             Answered
Outcome measurement      No metric linked
```

This is much more actionable than “PRD 78% complete.”

## Product Health Based on Knowledge Quality

The platform could measure the health of each capability or feature using dimensions such as:

### Coverage

Have the required questions been answered?

### Currency

Were the answers recently validated, and do they apply to the current release?

### Confidence

Are they supported by evidence, or are they assumptions?

### Consistency

Do specifications, code, configuration, tests, and documentation agree?

### Traceability

Can the organization navigate from customer problem to outcome, feature, release, and measured result?

### Ownership

Does every important answer have an accountable owner?

This creates a new kind of product-management dashboard: not merely delivery progress, but the health of the organization’s understanding of its product.

## Automated Impact Analysis

Because answers are represented as relationships, the platform can reason about changes.

Suppose someone proposes:

> Move audit-log export from Enterprise to Pro.

The platform could identify likely impacts on:

- Packaging and entitlement configuration
- Pricing pages
- Sales collateral
- Customer contracts
- In-product upgrade prompts
- Role permissions
- API documentation
- Support articles
- Analytics segmentation
- Revenue forecasts
- Tests
- Release communications

A ticket-centric system knows only which tickets are linked. A product graph can understand what concepts are affected.

## Contradiction Detection

The platform can identify incompatible answers, such as:

- A requirement says administrators can delete a workspace, but the permission model says only owners can.
- The UI copy says files are retained for 30 days, while the data policy says 90.
- An API schema marks a field optional, while the business rule requires it.
- A feature is listed in the Pro package but gated by an Enterprise entitlement.
- A metric requires an event property that instrumentation does not produce.

This is similar to static analysis in software development, but applied to product knowledge.

The platform becomes a **product specification linter**.

## Generated Views Rather Than Duplicated Documents

Different functions need different representations of the same product model.

A product manager may want:

- Outcome map
- Opportunity tree
- Roadmap
- Feature brief

An engineer may want:

- Behavioral specification
- State diagram
- Business rules
- API and data requirements

A designer may want:

- Journey
- Actors
- UI states
- Content requirements

A support agent may want:

- Current customer-facing behavior
- Eligibility rules
- Known limitations
- Troubleshooting steps

An executive may want:

- Strategic alignment
- Investment
- Outcomes
- Risks

The platform should generate or maintain these views from shared underlying objects. Users should not have to independently rewrite the same facts for every audience.

Generate only requested views. For a technical guide, reference, or explanation, use [technical-documentation](../../technical-documentation/SKILL.md#classify-the-need) for the reader's need and appropriate proof. For a bounded prose edit, use [deslop](../../deslop/SKILL.md#preserve-what-matters), protecting quotations, customer language, claim scope, effective dates, certainty, and evidence. A generated view creates no new authority.

## Product Time Travel

A temporal graph allows someone to ask:

- What did the product do in version 3.8?
- Why did we change this rule?
- Which customers were affected?
- What was promised in the contract at that time?
- Which metric justified the change?
- Which design and tests corresponded to that release?
- When did the current terminology replace the old terminology?

This is valuable for support, compliance, incident analysis, enterprise contracts, migrations, and institutional memory.

## Next Unanswered Question Workflows

Most product software waits for users to know what document or ticket to create.

A question-native system can be proactive:

> You have defined who can initiate the workflow, but not who can cancel it.

> This feature changes stored customer data, but no retention policy is linked.

> A success metric is defined, but no telemetry event can calculate it.

> The rollout targets European customers, but localization and data-residency applicability are unresolved.

> The feature is marked released, but its customer-facing documentation is still based on the previous version.

This could be one of the platform’s most valuable forms of AI assistance. It moves AI from “write more text” to “find missing reasoning.”

## Semantic Coverage and the Product Control Plane

An all-encompassing product-management platform should not necessarily recreate:

- Source control
- Design software
- Analytics infrastructure
- Customer support software
- CRM
- Project management
- Incident management
- Documentation editors

Trying to replace every specialist tool would likely create a broad but shallow suite.

> **Be all-encompassing in semantic coverage, not necessarily in execution-tool ownership.**

The platform can act as a **product control plane** over those systems. It knows:

- Which design defines which experience
- Which repository implements which capability
- Which events measure which outcome
- Which support cases are evidence for which problem
- Which tickets alter which product behavior
- Which releases made which answers effective
- Which contract or package grants which entitlement

Raw work may remain in specialized tools. The product platform owns the normalized product model, relationships, provenance, and lifecycle.

## Architecture

### Canonical Product Ontology

Core objects such as:

```text
Actor
Segment
Problem
Job
Outcome
Metric
Capability
Feature
Journey
Requirement
Rule
Permission
Entitlement
Data entity
Interface
Quality requirement
Risk
Evidence
Decision
Release
Experiment
Owner
```

### Claim and Relationship Model

Examples:

```text
Feature solves Problem
Feature implements Capability
Actor performs Journey
Rule constrains Feature
Plan entitles Segment to Feature
Metric measures Outcome
Evidence supports Problem
Test verifies Requirement
Release introduces Feature
Decision supersedes Decision
```

Each relationship should support scope, dates, evidence, confidence, and ownership.

### Federated Source Connections

Connections to delivery, design, code, analytics, CRM, support, documentation, and operations systems.

### Governance and Change Management

Approvals, versioning, proposals, exceptions, ownership, access control, and audit history.

### Generated Views

PRDs, roadmaps, briefs, test matrices, release notes, capability maps, role matrices, product documentation, and executive summaries.

### Intelligence

Coverage analysis, contradiction detection, impact analysis, stale-answer detection, evidence synthesis, and natural-language querying.

## Progressive Construction

Do not force users to populate an enormous taxonomy manually. That would turn the platform into a bureaucratic burden.

Instead, the system should progressively construct the product model from the work people already perform:

- Extract proposed requirements from briefs.
- Recognize rules in acceptance criteria.
- Link design components to features.
- Detect permissions in API policies.
- Connect analytics events to metrics.
- Identify decisions in meeting notes.
- Suggest relationships for human approval.
- Detect when an answer already exists elsewhere.
- Ask only the highest-value unresolved questions.

The ideal interaction is not:

> “Please complete these 87 fields.”

It is:

> “Three important answers are missing, two appear inconsistent, and one changed downstream dependency needs review.”

## Platform Thesis

The true object being managed is neither the backlog nor the roadmap. It is the organization’s evolving model of:

```text
Why the product exists
Who it serves
What it promises
How it behaves
What constrains it
How it changes
How the organization knows whether it works
```

> **Build a living, temporal, evidence-backed product graph that can answer any material question about the product, show why the answer is believed, identify where the answer applies, reveal what it affects, and preserve how it changed over time.**

That would be meaningfully more comprehensive than another system for writing PRDs or managing stories.
