import { flow } from "effect"
import { makeLatestIdentityOwner } from "../support/makeLatestIdentityOwner.js"
import { Scanner } from "./scannerData.js"
import type { ProgramMatchContext } from "./programMatchContext.js"
import type { Subscription } from "./subscription.js"

// Program-indexed matching owns one latest index because source scans share one semantic snapshot.
export const withProgramScannerIndex =
  <Index extends object>(build: (context: ProgramMatchContext) => Index) =>
  <Fact>(subscriptions: (index: Index) => ReadonlyArray<Subscription<Fact>>): Scanner<Fact> => {
    const indexOwner = makeLatestIdentityOwner(build)
    const indexForContext = (context: ProgramMatchContext) => indexOwner(context.program)(context)
    const plan = flow(indexForContext, subscriptions)

    return new Scanner({ plan })
  }
