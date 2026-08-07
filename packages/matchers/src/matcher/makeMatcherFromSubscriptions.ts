import * as ts from "typescript"
import { Matcher } from "./matcherData.js"
import type { ProgramMatchContext } from "./programMatchContext.js"
import type { Subscription } from "./subscription.js"

export const emptyCompilerOptions: ts.CompilerOptions = {}

export const makeMatcherFromSubscriptions = <Fact>(
  plan: (context: ProgramMatchContext) => ReadonlyArray<Subscription<Fact>>
) => new Matcher<Fact>({ plan, compilerOptions: emptyCompilerOptions })
