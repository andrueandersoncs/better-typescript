import type { ProgramMatchContext } from "./programMatchContext.js"
import type { Subscription } from "./subscription.js"
import { Data } from "effect"

// Scanner exists because its fields form one stable data contract used by the linter.
export class Scanner<Fact = unknown> extends Data.Class<{
  readonly plan: (context: ProgramMatchContext) => ReadonlyArray<Subscription<Fact>>
}> {}
