# User

I'm building out a product management system for a software team. I need to fully catalog the product. What else should I be cataloging other than User Stories in order to fully specify the product?

# Assistant

User stories capture **a slice of desired behavior from one actor’s perspective**. They do not fully describe why the product exists, how the experience fits together, what rules govern it, how the system behaves under stress, or how success is measured.

A useful product management system should catalog three kinds of information:

1. **Durable product truth** — what the product is and how it behaves.
2. **Change intent** — what you plan to add, modify, or remove.
3. **Evidence and operations** — why decisions were made and how the product performs in reality.

## Recommended product catalog

| Area | What to catalog | What it answers |
|---|---|---|
| Product structure | Products, platforms, product areas, modules, domains, channels | Where does this functionality belong? |
| Strategy | Vision, principles, strategic themes, objectives, key results | Why are we building and maintaining this product? |
| Customers | Segments, personas, actors, roles, jobs-to-be-done | Who is the product for, and what are they trying to accomplish? |
| Problems | Customer problems, opportunities, pain points, unmet needs | What problem are we solving? |
| Outcomes | Desired behavior changes, business outcomes, success metrics | What should improve if the solution works? |
| Capabilities | Stable things the product enables customers or the business to do | What can the product do? |
| Features | Specific implementations of capabilities | How is a capability currently delivered? |
| Journeys | End-to-end user journeys, workflows, scenarios, use cases | How do users accomplish a goal across multiple features? |
| Requirements | Functional requirements, user stories, system requirements | What behavior must be implemented? |
| Acceptance | Acceptance criteria, examples, test scenarios, definition of done | How will we know the behavior is correct? |
| Business rules | Validation rules, calculations, eligibility, limits, policies, state transitions | What logic governs behavior? |
| Roles and permissions | Actors, permissions, access policies, ownership rules | Who may see or do what? |
| Experience | Information architecture, navigation, screens, components, content, UI states | What does the user experience look like? |
| Edge cases | Empty, loading, error, offline, timeout, duplicate, partial-success and recovery states | What happens outside the happy path? |
| Data | Business entities, fields, relationships, ownership, retention, lineage | What information does the product store and manipulate? |
| Interfaces | APIs, events, webhooks, imports, exports, integrations | How does the product communicate with other systems? |
| Nonfunctional requirements | Performance, availability, scalability, security, accessibility, localization, compatibility | How well must the product work? |
| Commercial model | Plans, packages, entitlements, usage limits, billing rules, SLAs | Who receives which functionality and under what terms? |
| Analytics | Metric definitions, telemetry events, properties, funnels, dashboards | How will product usage and outcomes be measured? |
| Experiments | Hypotheses, variants, targeting, guardrails, results | What are we testing and what did we learn? |
| Delivery | Initiatives, epics, releases, milestones, feature flags, rollout plans | When and how will changes reach users? |
| Decisions | Product decisions, alternatives considered, rationale, assumptions | Why does the product work this way? |
| Dependencies | Internal systems, external vendors, teams, contractual dependencies | What could block or constrain a change? |
| Risks | Product, technical, operational, legal, security and adoption risks | What could go wrong? |
| Evidence | Research findings, interviews, support cases, sales feedback, usage data | What supports the problem or decision? |
| Operations | Monitoring, SLOs, alerts, support procedures, incident history | How is the product operated after release? |
| Lifecycle | Proposed, experimental, active, deprecated, retired states | Is this functionality still supported? |
| Glossary | Canonical terms, definitions, synonyms, prohibited terminology | What does each product term mean? |

## The most important distinction: capability versus feature versus story

These are commonly mixed together.

**Capability**  
A durable customer or business ability.

> “Administrators can control access to organizational resources.”

**Feature**  
A specific product mechanism that supplies some or all of that capability.

> “Role-based access control with custom roles.”

**User story**  
A planned slice of work or behavior associated with that feature.

> “As an administrator, I can create a custom role so that I can delegate responsibilities without granting full access.”

The capability may survive for ten years. The feature may be redesigned several times. The story may be completed in one sprint. They should not be represented as the same kind of object.

## A practical information hierarchy

A strong default hierarchy is:

```text
Product
└── Product Area / Domain
    └── Capability
        └── Feature
            ├── Journey or Use Case
            ├── Functional Requirement / User Story
            ├── Acceptance Criteria
            ├── Business Rules
            ├── UI and Content
            ├── Data Objects
            ├── APIs and Events
            ├── Nonfunctional Requirements
            └── Tests
```

The hierarchy alone is not enough. Add traceability across it:

```text
Persona / Segment
        ↓
Job-to-be-Done or Customer Problem
        ↓
Desired Outcome and Metric
        ↓
Initiative
        ↓
Capability
        ↓
Feature
        ↓
Requirement / Story
        ↓
Acceptance Criteria and Tests
        ↓
Release
        ↓
Observed Product Metrics and Feedback
```

This lets someone trace a line from a shipped behavior all the way back to the customer problem and forward to the resulting evidence.

## Cross-cutting specifications that should attach to features

Some information does not fit neatly underneath a user story. Attach these directly to a feature or capability:

### Business rules

Catalog rules as independent, reusable objects rather than burying them inside story descriptions.

Examples:

- An invitation expires after seven days.
- Only organization owners may transfer ownership.
- A project cannot be deleted while it has an active deployment.
- Usage is rounded up to the next whole unit for billing.
- A suspended user remains visible in historical audit records.

Give each rule an identifier so a feature, API, screen and test can all reference the same rule.

### State models

For important entities, specify states and allowed transitions.

```text
Draft → Submitted → Approved → Published → Archived
          ↓
        Rejected
```

For every transition, record:

- Who can trigger it
- Preconditions
- Side effects
- Notifications
- Audit behavior
- Reversal behavior
- Failure handling

Many product ambiguities are actually missing state-transition specifications.

### Role and entitlement matrices

Separate these concepts:

- **Role:** what a user is permitted to do.
- **Entitlement:** what a customer has purchased or been granted.
- **Feature flag:** whether functionality is technically enabled.
- **Eligibility:** whether a user or account meets contextual conditions.

A user may have permission to use a feature but lack the required plan entitlement, for example.

### Nonfunctional requirements

User stories usually describe successful functional behavior. They rarely define quality thresholds. Catalog measurable requirements such as:

- Search results appear within 500 milliseconds at the 95th percentile.
- The workflow supports 10,000 records per account.
- The service has a 99.95% availability objective.
- All functionality is keyboard operable.
- Customer data remains in its selected geographic region.
- Audit logs are retained for seven years.
- The operation is idempotent when retried.

Avoid vague requirements such as “fast,” “secure,” or “scalable.”

### Analytics contracts

For each important behavior, specify:

- Event name
- Trigger condition
- Required properties
- User and account identifiers
- Sensitive-data restrictions
- Metric or funnel using the event
- Event owner
- Schema version

Analytics should be part of the feature specification, not an afterthought added after release.

## Evidence should be first-class

Do not only catalog conclusions. Catalog the evidence behind them:

- Interview observations
- Research insights
- Survey results
- Support cases
- Lost-deal reasons
- Product usage patterns
- Experiment results
- Market or regulatory evidence

Distinguish among:

- **Raw evidence:** what was observed
- **Insight:** an interpretation across observations
- **Problem or opportunity:** something worth addressing
- **Decision:** the action chosen
- **Assumption:** something believed but not yet validated

This prevents unverified assumptions from gradually turning into “facts.”

## Metadata every catalog object should have

Regardless of object type, most records should include:

- Stable identifier
- Name and concise description
- Object type
- Owner
- Lifecycle status
- Product area
- Applicable personas or roles
- Applicable plans, platforms, regions and versions
- Source or supporting evidence
- Dependencies
- Related decisions
- Risks and assumptions
- Created and last-updated dates
- Last-validated date
- Links to related objects
- Version or revision history

A **last-validated date** is especially useful. Product documentation often becomes dangerous not because it is missing, but because obsolete information still appears authoritative.

## Separate product truth from delivery work

Avoid making the issue tracker the sole product catalog.

A delivery item might say:

> Add the ability to resend an invitation.

The durable product specification should separately describe:

- Who may invite users
- Which email addresses are eligible
- Invitation expiration
- Resend limits
- Existing-user behavior
- Duplicate invitation handling
- Seat availability rules
- Email content and localization
- Audit events
- API behavior
- Analytics events
- Performance requirements
- Error and recovery states

The ticket can close. The product behavior remains and should still be discoverable.

A useful separation is:

| Layer | Typical objects |
|---|---|
| Product truth | Capabilities, features, journeys, rules, data, permissions, APIs, NFRs |
| Planning and delivery | Initiatives, epics, stories, tasks, releases, rollout plans |
| Evidence and learning | Research, feedback, metrics, experiments, decisions |
| Operations | SLOs, incidents, support procedures, deprecations |

## Example: fully cataloging one feature

For a feature called **Invite teammates**, a complete catalog might contain:

- **Capability:** Team administration
- **Persona:** Organization administrator
- **Job:** Add colleagues while preserving access control
- **Journey:** Create organization → invite team → assign roles → confirm access
- **Feature:** Email-based invitations
- **User stories:** Send, resend, cancel and accept invitations
- **Roles:** Owner and administrator can invite; members cannot
- **Entitlements:** Available only on team plans
- **Business rules:** Seven-day expiration; maximum five resend attempts per day
- **States:** Pending, accepted, expired, canceled
- **Edge cases:** Existing user, duplicate invitation, no seats, invalid domain, bounced email
- **UI:** Invitation form, pending list, status messages, confirmation page
- **Content:** Email subject, body, error messages and localization keys
- **Data:** Invitation ID, organization, email, role, inviter, expiration, status
- **API:** Create, list, resend and cancel endpoints
- **Events:** Invitation sent, delivered, accepted, expired and canceled
- **Security:** Signed single-use acceptance token
- **Accessibility:** Status changes announced to assistive technology
- **Performance:** Send request confirmed within two seconds
- **Acceptance tests:** Scenarios for each state, rule and permission
- **Metric:** Invitation acceptance rate within seven days
- **Release:** Version introduced, rollout status and feature flag
- **Owner:** Team administration product area
- **Evidence:** Research and support requests demonstrating the need
- **Decision record:** Why invitations expire after seven days

That is substantially more complete than a collection of invitation-related stories.

## A sensible minimum viable catalog

To avoid designing an enormous taxonomy before anyone uses it, begin with these core entities:

1. Product area
2. Persona or actor
3. Problem or job-to-be-done
4. Outcome and metric
5. Capability
6. Feature
7. Journey or use case
8. Business rule
9. Functional requirement or story
10. Acceptance criterion
11. Nonfunctional requirement
12. Data object
13. API, integration or event
14. Decision
15. Release or product version

Add research, experiments, commercial packaging, operations and detailed UX objects as the system matures.

The defining quality of the system should not be the number of artifacts it stores. It should be its ability to answer:

> **Who needs this, why does it exist, exactly how does it behave, what constrains it, how is it measured, which version contains it, and what evidence supports it?**

# User

Given the table above and the "what it answers" column: what insight does the aggregate list of "what it answers" **questions** give us into the nature of product management itself? Anything we can exploit when building an all-encompassing product management platform?

# Assistant

## The central insight

The aggregate list reveals that **product management is fundamentally an answer-coherence discipline**.

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

---

# What the questions reveal about product management

## 1. Product management is organizational knowledge management

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

---

## 2. Product management is decision-making under uncertainty

Many of the questions do not initially have factual answers.

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

---

## 3. Product management is relational, not hierarchical

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

This is one of the largest opportunities for a comprehensive platform:

> Use a **product knowledge graph** as the canonical model, while allowing users to navigate it through familiar documents, lists, matrices, roadmaps, and boards.

The graph is the underlying model. The document is just a view.

---

## 4. Product management is temporal

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

### Current product

What customers can use now.

### Historical product

What a particular customer, version, release, or contract received at a specific time.

### Planned product

What the organization intends to make true in the future.

Conventional product tools routinely mix these together. A planned story appears next to an implemented requirement; a deprecated behavior remains in a PRD; an old design still looks authoritative.

A comprehensive platform should model validity explicitly:

```text
Proposed → Approved → In Development → Released → Deprecated → Retired
```

It should also maintain effective dates, applicable releases, and supersession relationships.

---

## 5. Product management is a continuous control loop

The aggregate questions form a loop rather than a linear delivery process:

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

---

## 6. Product management reconciles three different products

Every organization effectively has three versions of its product.

### The intended product

What strategy, requirements, designs, policies, and decisions say should exist.

### The implemented product

What the code, configuration, feature flags, APIs, infrastructure, and data schemas actually provide.

### The experienced product

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

---

# The platform opportunity: make it question-native

Instead of making the primary unit a page, ticket, or spreadsheet row, make it an **answerable product claim**.

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

---

# A useful universal question model

The “what it answers” questions can be collapsed into a relatively stable set of dimensions.

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

---

# Features this model enables

## 1. Question-driven completeness analysis

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

---

## 2. Product health based on knowledge quality

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

---

## 3. Automated impact analysis

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

---

## 4. Contradiction detection

The platform can identify incompatible answers, such as:

- A requirement says administrators can delete a workspace, but the permission model says only owners can.
- The UI copy says files are retained for 30 days, while the data policy says 90.
- An API schema marks a field optional, while the business rule requires it.
- A feature is listed in the Pro package but gated by an Enterprise entitlement.
- A metric requires an event property that instrumentation does not produce.

This is similar to static analysis in software development, but applied to product knowledge.

The platform becomes a **product specification linter**.

---

## 5. Generated views rather than duplicated documents

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

---

## 6. Product time travel

A temporal graph allows someone to ask:

- What did the product do in version 3.8?
- Why did we change this rule?
- Which customers were affected?
- What was promised in the contract at that time?
- Which metric justified the change?
- Which design and tests corresponded to that release?
- When did the current terminology replace the old terminology?

This is valuable for support, compliance, incident analysis, enterprise contracts, migrations, and institutional memory.

---

## 7. “Next unanswered question” workflows

Most product software waits for users to know what document or ticket to create.

A question-native system can be proactive:

> You have defined who can initiate the workflow, but not who can cancel it.

> This feature changes stored customer data, but no retention policy is linked.

> A success metric is defined, but no telemetry event can calculate it.

> The rollout targets European customers, but localization and data-residency applicability are unresolved.

> The feature is marked released, but its customer-facing documentation is still based on the previous version.

This could be one of the platform’s most valuable forms of AI assistance. It moves AI from “write more text” to “find missing reasoning.”

---

# The correct meaning of “all-encompassing”

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

Instead:

> **Be all-encompassing in semantic coverage, not necessarily in execution-tool ownership.**

The platform can act as a **product control plane** over those systems.

It knows:

- Which design defines which experience
- Which repository implements which capability
- Which events measure which outcome
- Which support cases are evidence for which problem
- Which tickets alter which product behavior
- Which releases made which answers effective
- Which contract or package grants which entitlement

Raw work may remain in specialized tools. The product platform owns the normalized product model, relationships, provenance, and lifecycle.

---

# A possible architecture

## Layer 1: Canonical product ontology

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

## Layer 2: Claim and relationship model

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

## Layer 3: Federated source connections

Connections to delivery, design, code, analytics, CRM, support, documentation, and operations systems.

## Layer 4: Governance and change management

Approvals, versioning, proposals, exceptions, ownership, access control, and audit history.

## Layer 5: Generated views

PRDs, roadmaps, briefs, test matrices, release notes, capability maps, role matrices, product documentation, and executive summaries.

## Layer 6: Intelligence

Coverage analysis, contradiction detection, impact analysis, stale-answer detection, evidence synthesis, and natural-language querying.

---

# The most important product-design principle

Do not force users to populate an enormous taxonomy manually.

That would turn the platform into a bureaucratic burden.

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

---

# A concise platform thesis

The aggregate questions suggest that the true object being managed is neither the backlog nor the roadmap.

It is the organization’s evolving model of:

```text
Why the product exists
Who it serves
What it promises
How it behaves
What constrains it
How it changes
How the organization knows whether it works
```

That yields a strong north star:

> **Build a living, temporal, evidence-backed product graph that can answer any material question about the product, show why the answer is believed, identify where the answer applies, reveal what it affects, and preserve how it changed over time.**

That would be meaningfully more comprehensive than another system for writing PRDs or managing stories.