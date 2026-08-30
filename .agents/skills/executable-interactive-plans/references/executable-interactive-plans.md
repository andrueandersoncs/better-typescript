# Executable Interactive Plans

## Problem

Coding agents often reinterpret prose plans, expand the scope, and implement behavior that was never intended. Reviewing their code is slow because the intended behavior must be reconstructed from the plan, implementation, and running application.

An executable interactive plan makes the intended system concrete before implementation is delegated. It gives a human a fast way to explore and approve the plan, gives coding agents stable behavioral boundaries, and supplies reusable scenarios for verifying the resulting implementation.

## Core idea

An executable interactive plan is a **typed, executable diagram of a user story**.

It may be modeled as a state machine, an extended state machine, or another typed transition system. It does not need to have a finite set of complete application states. A small set of named story positions can carry unbounded domain data validated by real Effect Schemas.

The diagram and simulation are one artifact:

> Interacting with the diagram runs the simulation.

```text
User action
    ↓
Executable transition
    ↓
Domain result + database changes + external effects
    ↓
Updated diagram
```

A user can step through a story, choose actions, inspect state, observe relevant database changes and external calls, reset the world, and try another path. The resulting experience is both an interactive reference model and an executable plan.

## What the artifact contains

The executable diagram contains:

- Actors and available actions
- Important story positions and domain state
- Transitions, guards, and invariants
- Inputs, outputs, and errors described by canonical Effect Schemas where available or useful
- Existing domain functions and Effects where they already express the plan
- Explicit Effect services for every external boundary
- Deterministic simulation Layers for those services
- An ephemeral database accessed through the appropriate Effect database packages
- Initial fixtures and scripted external responses
- Recorded database changes and external calls
- Representative story paths and acceptance observations

The diagram is the direct interaction and inspection surface for this running model. Selecting a node or transition can show its schemas, required services, expected effects, failure outcomes, and current invariant status.

## Explicit Effect simulation

The plan runs as a closed, controlled Effect system. Every external capability is visible in the Effect environment.

A transition might have a shape such as:

```ts
Effect<
  CancelOrderResult,
  CancelOrderError,
  OrderRepository | PaymentProvider | EmailProvider | Clock
>
```

The interactive plan supplies deterministic simulation Layers for remote services and other controlled capabilities. Database-backed services reuse the real query or repository Layers, supplied with an ephemeral SQL client for the matching database dialect. The runner composes these Layers into the complete simulation environment.

Each external-service simulation:

- Accepts the canonical request contract and Schema where available
- Returns the canonical response or error contract and Schema where available
- Provides scripted outcomes, latency, and failures
- Records every call, including ordering and retry attempts made by the program
- Makes its observations available in the diagram

Time, randomness, queues, filesystems, and other external capabilities follow the same service-and-Layer model when they participate in the story.

## Database simulation

Database access is an explicit Effect boundary too. The simulation uses the appropriate real Effect database package with a fresh ephemeral database.

It exercises the planned or existing:

- Database schemas and migrations
- Queries and repository operations
- Serialization
- Transactions
- Constraints
- Persisted outcomes

The simulation uses the same database dialect as the intended system. A PostgreSQL application uses an ephemeral PostgreSQL database through the corresponding Effect PostgreSQL package. A SQLite application uses an ephemeral or in-memory SQLite database through the corresponding Effect SQLite package.

The database contents and lifecycle are controlled by the simulation while its relevant database behavior remains realistic.

## Reuse in both directions

The plan should reuse as much canonical code from the existing codebase as practical:

- Effect Schemas
- Domain types and errors
- Existing functions and Effects
- Service contracts
- Queries, repositories, and migrations

Accepted scenarios keep one canonical set of inputs and expected observations. A diagram adapter runs them through the simulation; an implementation adapter runs them through the application's public behavioral seams.

Other plan artifacts should contribute as much as practical to implementation and verification:

- New behavioral Schemas and service contracts can become production seams
- Approved invariants can become unit or property tests
- Simulation Layers can remain test infrastructure
- Fixtures can seed repeatable tests and local demonstrations
- The interactive diagram can remain a review and debugging tool

This reuse reduces translation between planning and implementation without requiring production internals to copy the simulation.

## Approval freezes behavioral interfaces

Accepting the plan freezes its **behavioral interfaces**. Here, an interface means a behaviorally important seam rather than only a TypeScript `interface` declaration.

The accepted interfaces include:

- User and system actions
- Inputs, outputs, events, and errors
- Behaviorally important observable states and transitions
- Guards, postconditions, and invariants
- External-service request and response contracts
- Meaningful call ordering and failure behavior
- Persistence guarantees and transaction boundaries
- Observable outcomes for representative story paths

Implementation can change and expand behind these interfaces. Its modules, private APIs, algorithms, data structures, intermediate states, and internal control flow can evolve as the implementation becomes clearer. Diagram story positions do not need to map one-to-one to an internal implementation state machine. Changes to accepted observable behavior require the plan to be reviewed again.

This gives coding agents room to discover a good implementation while preventing them from silently redefining the intended system.

## Planning and implementation workflow

### 1. Build the executable diagram

Model the user story using canonical codebase artifacts where available. Add proposed schemas and behavioral seams where the story requires new behavior. Supply explicit simulation Layers and an ephemeral database.

### 2. Explore the plan

Drive the diagram through the important paths. Inspect:

- State before and after each action
- Public results and errors
- Database changes
- External requests and responses
- Call ordering
- Invariant status

Revise the plan until the intended behavior is coherent and understandable.

### 3. Accept the behavioral interfaces

Approval records the diagram's behavioral interfaces and representative scenarios as the implementation contract.

### 4. Delegate implementation

Coding agents implement and expand the real system behind the accepted interfaces. They may reuse approved schemas, functions, Effects, fixtures, and Layers directly wherever that produces the clearest implementation.

### 5. Verify conformance

Run the canonical accepted scenarios through both the diagram adapter and the implementation's public-seam adapter. Apply the verification responsibilities below.

## Verification boundary

The executable diagram verifies the **plan**:

- The data model can represent the story
- Operations compose in the required order
- Required service boundaries are explicit
- Database behavior supports the intended transitions
- External interactions are specified
- Representative paths execute successfully
- Accepted invariants hold for the explored paths

The implementation test suite verifies the **final code**:

- Unit and property tests verify domain operations and invariants
- Integration tests verify adapters and persistence
- End-to-end tests replay important paths through the real application
- Conformance scenarios verify that the implementation preserves the accepted behavioral interfaces

Together, these answer two separate questions:

> **Executable interactive plan:** Is this the system we intend to build?

> **Implementation verification:** Did we build a system that preserves that intent?

## Example

```text
[Paid order]
      │
      │ Cancel order
      ▼
[Cancelled order]
```

Executing `Cancel order` in the diagram could display:

```text
Result
✓ Order status is "cancelled"

Database
✓ Cancellation persisted
✓ Inventory restored in the same transaction

External services
✓ Payment refund requested for $40
✓ Cancellation email requested after the refund succeeded

Invariants
✓ A shipped order was not cancelled
✓ Refunded amount does not exceed the captured amount
```

This is the plan itself running—not a static picture of what the plan might mean.
