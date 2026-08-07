import type * as ts from "typescript"
import type { ProgramMatchContext } from "./programMatchContext.js"
import type { Subscription } from "./subscription.js"
import { Data } from "effect"

// Matcher is a program-stage recognition plan because reporting and guidance stay outside matching.
export class Matcher<Fact = unknown> extends Data.Class<{
  readonly plan: (context: ProgramMatchContext) => ReadonlyArray<Subscription<Fact>>
  readonly compilerOptions: ts.CompilerOptions
}> {}
