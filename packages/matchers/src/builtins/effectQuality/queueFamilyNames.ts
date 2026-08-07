import { Array } from "effect"

import * as ts from "typescript"

const queueFamilyNames = Array.make("Queue", "PubSub", "SubscriptionRef", "Dequeue", "Enqueue")

export const identifierIsQueueFamily = (identifier: ts.Identifier) =>
  Array.contains(queueFamilyNames, identifier.text)
