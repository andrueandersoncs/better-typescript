---
name: executable-interactive-plans
description: "Turn user stories into @effect/vitest Arbitrary tests plus exact proposed Effect Schemas, Errors, Services, and function signatures. Use when a human wants to review, run, edit, and agree on those contracts before implementation."
compatibility: Requires a browser, a local JavaScript runtime, Effect v4, and @effect/vitest.
---

# Executable Interactive Plans

The plan is agreement on four Effect contracts, proven by executable story tests.

The human reviews two questions:

1. **Do these tests express the behavior I want?**
2. **Do these Schemas, Errors, Services, and Effectful function signatures match that behavior?**

Read [references/executable-interactive-plans.md](references/executable-interactive-plans.md). Start from [assets/story-test-template](assets/story-test-template).

Gall's Law: ship the smallest complete set of those four contracts. Hyrum's Law: once agreed, every observable of those signatures is the contract.

## The four contracts

Group Proposed Code as **Schemas**, **Errors**, **Services**, and **Effectful functions**. Write each item as exact editable source.

### Schemas

Effect Schemas for inputs, outputs, and domain values. Tests generate from these Schemas. Do not hand-build random values beside them.

### Errors

`Schema.Error` classes that appear in the `E` channel. Every Error in a signature is proposed code. A story test that lists an Error must assert that Error.

### Services

`Context.Service` contracts. The `R` channel names these Services. Test Layers provide them and are not Proposed Code.

### Effectful function signatures

Write the full signature and call it from the tests:

```ts
(input: Input): Effect.Effect<Success, Error, Service>
```

## Story tests

Each story owns at least one `@effect/vitest` property. Generate from the exact proposed Schema. Provide a fresh Service Layer per generated case. Call the exact proposed function. Assert the caller-visible success or Error. Each signature lists its input Schema, success Schema, Errors, and Services; each test lists those same IDs.

```ts
import { assert, it } from "@effect/vitest"
import { Effect } from "effect"
import { CreateTaskInput } from "../domain/task"
import { createTask, listTasks, makeTaskService } from "../domain/task-service"

it.effect.prop("creates every valid generated task as incomplete", [CreateTaskInput], ([input]) =>
  Effect.gen(function* () {
    const layer = yield* makeTaskService([])
    const created = yield* createTask(input).pipe(Effect.provide(layer))
    const tasks = yield* listTasks.pipe(Effect.provide(layer))

    assert.strictEqual(created.title, input.title)
    assert.isFalse(created.completed)
    assert.deepStrictEqual(tasks, [created])
  }), { fastCheck: { numRuns: 25 } })
```

Keep one test file per property so the whole file is the editable range.

## Workflow

### 1. Name the stories

Keep authored story order. For each story, state the caller-visible outcome and the Schema, Error, Service, and function IDs it exercises.

### 2. Create the artifact

```sh
node scripts/create-plan.mjs <artifact-destination>
```

Replace plan data, story tests, proposed domain code, and theme tokens. Keep the shared review shell and review server.

### 3. Fill the four contracts, then the tests

Write Schemas, Errors, Services, and signatures first. Then write `it.effect.prop` tests that generate from those Schemas and call those functions.

### 4. Review in the browser

Story Tests runs and edits each property. Proposed Code edits the four contract groups. Saving a test resets that test. Saving a contract resets every linked test. Approval stays off until every current test passes.

Goodhart's Law: green tests are evidence. The human decision is the result.

### 5. Pause for the human

Keep one decision control and one **Export review** action. Never infer approval.

## Completion

Return:

- The browser URL
- The artifact path
- The current source-snapshot ID
- The story-test result summary
- The one next human action
