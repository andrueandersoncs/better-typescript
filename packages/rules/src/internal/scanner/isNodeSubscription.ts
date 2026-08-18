import { NodeSubscription } from "./nodeSubscription.js"
import type { Subscription } from "./subscription.js"
import { Predicate } from "effect"

export const isNodeSubscription = <Fact>(
  subscription: Subscription<Fact>
): subscription is NodeSubscription<Fact> => Predicate.hasProperty(subscription, "kinds")
