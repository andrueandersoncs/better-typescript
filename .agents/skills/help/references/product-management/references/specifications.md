# Feature Specifications

Specify reusable behavior that does not belong inside a user story. Read this when defining or reviewing a capability or feature.

## Business Rules

Catalog rules as independent, reusable objects rather than burying them inside story descriptions.

Examples:

- An invitation expires after seven days.
- Only organization owners may transfer ownership.
- A project cannot be deleted while it has an active deployment.
- Usage is rounded up to the next whole unit for billing.
- A suspended user remains visible in historical audit records.

Give each rule an identifier so a feature, API, screen and test can all reference the same rule.

## State Models

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

## Roles, Entitlements, Flags, and Eligibility

Separate these concepts:

- **Role:** what a user is permitted to do.
- **Entitlement:** what a customer has purchased or been granted.
- **Feature flag:** whether functionality is technically enabled.
- **Eligibility:** whether a user or account meets contextual conditions.

A user may have permission to use a feature but lack the required plan entitlement, for example.

## Nonfunctional Requirements

User stories usually describe successful functional behavior. They rarely define quality thresholds. Catalog measurable requirements such as:

- Search results appear within 500 milliseconds at the 95th percentile.
- The workflow supports 10,000 records per account.
- The service has a 99.95% availability objective.
- All functionality is keyboard operable.
- Customer data remains in its selected geographic region.
- Audit logs are retained for seven years.
- The operation is idempotent when retried.

Avoid vague requirements such as “fast,” “secure,” or “scalable.”

## Analytics Contracts

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

