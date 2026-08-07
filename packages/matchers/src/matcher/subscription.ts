import { FileSubscription } from "./fileSubscription.js"
import { NodeSubscription } from "./nodeSubscription.js"

// Subscription is the planner unit union because fused run accepts node and file plans together.
export type Subscription<Fact = unknown> = NodeSubscription<Fact> | FileSubscription<Fact>
