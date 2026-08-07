import { Array } from "effect"

import * as ts from "typescript"

import { callIsEffectApi } from "./callIsEffectApi.js"

const queueConstructorNames = Array.make("make", "bounded", "unbounded", "dropping", "sliding")

const pubSubConstructorNames = Array.make(
  "make",
  "bounded",
  "unbounded",
  "dropping",
  "sliding",
  "makeAtomicBounded",
  "makeAtomicUnbounded"
)

const subscriptionRefConstructorNames = Array.of("make")

export const queueConstructorSignals = (checker: ts.TypeChecker) => (call: ts.CallExpression) => {
  const queue = callIsEffectApi(checker)("Queue")(queueConstructorNames)(call)
  const pubsub = callIsEffectApi(checker)("PubSub")(pubSubConstructorNames)(call)

  const subscriptionRef = callIsEffectApi(checker)("SubscriptionRef")(
    subscriptionRefConstructorNames
  )(call)

  return Array.make(queue, pubsub, subscriptionRef)
}
