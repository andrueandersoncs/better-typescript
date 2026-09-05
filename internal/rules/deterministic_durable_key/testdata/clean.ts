import { Schema } from "effect"
import { DurableQueue, Workflow } from "effect/unstable/workflow"
import { Rpc } from "effect/unstable/rpc"

const payloadForExecution = { id: crypto.randomUUID() }

const workflow = Workflow.make("Workflow", {
  payload: { id: Schema.String },
  idempotencyKey: ({ id }) => id,
})

const queue = DurableQueue.make({
  name: "queue",
  payload: { id: Schema.String },
  idempotencyKey: () => "singleton",
})

const rpc = Rpc.make("Rpc", {
  payload: { id: Schema.String },
  primaryKey: ({ id }) => {
    const deferred = () => Math.random().toString()
    void deferred
    return id
  },
})

const localKey = Workflow.make("Local", {
  payload: { id: Schema.String },
  idempotencyKey: ({ id }) => (Date.now(), id),
})

const observed = Workflow.make("Observed", {
  payload: { id: Schema.String },
  idempotencyKey: ({ id }) => {
    void Date.now()
    return id
  },
})

const WorkflowLike = {
  make: (_tag: string, _options: { idempotencyKey: () => string }): unknown => undefined,
}
WorkflowLike.make("local", { idempotencyKey: () => Math.random().toString() })

void payloadForExecution
void workflow
void queue
void rpc
void localKey
