import { Schema } from "effect"
import { DurableQueue, Workflow } from "effect/unstable/workflow"
import { Rpc } from "effect/unstable/rpc"

const workflow = Workflow.make("Workflow", {
  payload: { id: Schema.String },
  idempotencyKey: () => Math.random().toString(),
})

const queue = DurableQueue.make({
  name: "queue",
  payload: { id: Schema.String },
  idempotencyKey: () => {
    const key = Date.now().toString()
    return key
  },
})

const rpc = Rpc.make("Rpc", {
  payload: { id: Schema.String },
  primaryKey: () => crypto.randomUUID(),
})

const dated = Workflow.make("Dated", {
  payload: { id: Schema.String },
  idempotencyKey: () => new Date().toISOString(),
})

const keyed = Rpc.make("Keyed", {
  payload: { id: Schema.String },
  primaryKey: () => crypto.getRandomValues(new Uint8Array(1)).toString(),
})
const prefixed = Workflow.make("Prefixed", {
  payload: { id: Schema.String },
  idempotencyKey: () => {
    const id = crypto.randomUUID()
    return "w:" + id
  },
})

const templated = Workflow.make("Templated", {
  payload: { id: Schema.String },
  idempotencyKey: () => {
    const id = crypto.randomUUID()
    return `w:${id}`
  },
})


void workflow
void queue
void rpc
