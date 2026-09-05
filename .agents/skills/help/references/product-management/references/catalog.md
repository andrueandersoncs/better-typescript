# Product Catalog

Record the durable product: object types, hierarchy, metadata, evidence, and a complete feature example.

User stories capture **a slice of desired behavior from one actor’s perspective**. They do not fully describe why the product exists, how the experience fits together, what rules govern it, how the system behaves under stress, or how success is measured.

A useful product management system should catalog three kinds of information:

1. **Durable product truth** — what the product is and how it behaves.
2. **Change intent** — what you plan to add, modify, or remove.
3. **Evidence and operations** — why decisions were made and how the product performs in reality.

## Recommended Catalog

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

## Capability, Feature, and Story

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

## Information Hierarchy

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

## Evidence

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

## Shared Metadata

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

## Product Truth and Delivery Work

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

| Layer | Typical objects |
|---|---|
| Product truth | Capabilities, features, journeys, rules, data, permissions, APIs, NFRs |
| Planning and delivery | Initiatives, epics, stories, tasks, releases, rollout plans |
| Evidence and learning | Research, feedback, metrics, experiments, decisions |
| Operations | SLOs, incidents, support procedures, deprecations |

## Example: Invite Teammates

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

## Minimum Viable Catalog

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
