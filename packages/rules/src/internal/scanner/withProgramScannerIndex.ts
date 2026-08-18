import { makeScannerFromSubscriptions } from "./makeScannerFromSubscriptions.js"
import { Scanner } from "./scannerData.js"
import type { ProgramMatchContext } from "./programMatchContext.js"
import type { Subscription } from "./subscription.js"
import { flow } from "effect"

// Program-indexed matching shares one index because each plan reads the same precomputed view.
export const withProgramScannerIndex =
  <Index>(build: (context: ProgramMatchContext) => Index) =>
  <Fact>(subscriptions: (index: Index) => ReadonlyArray<Subscription<Fact>>): Scanner<Fact> =>
    makeScannerFromSubscriptions(flow(build, subscriptions))
