import { NodeSubscription } from "./nodeSubscription.js"
import type { Subscription } from "./subscription.js"
import { Predicate } from "effect"

export const isNodeSubscription = (subscription: Subscription): subscription is NodeSubscription =>
  Predicate.hasProperty(subscription, "kinds")
