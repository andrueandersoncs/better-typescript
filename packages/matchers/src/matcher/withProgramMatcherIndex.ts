import { makeMatcherFromSubscriptions } from "./makeMatcherFromSubscriptions.js"
import { Matcher } from "./matcherData.js"
import type { ProgramMatchContext } from "./programMatchContext.js"
import type { Subscription } from "./subscription.js"
import { flow } from "effect"

// Program-indexed matching shares one index because each plan reads the same precomputed view.
export const withProgramMatcherIndex =
  <Index>(build: (context: ProgramMatchContext) => Index) =>
  <Fact>(subscriptions: (index: Index) => ReadonlyArray<Subscription<Fact>>): Matcher<Fact> =>
    makeMatcherFromSubscriptions(flow(build, subscriptions))
