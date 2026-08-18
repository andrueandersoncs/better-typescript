import * as ts from "typescript"
import { Scanner } from "./scannerData.js"
import type { ProgramMatchContext } from "./programMatchContext.js"
import type { Subscription } from "./subscription.js"

export const emptyCompilerOptions: ts.CompilerOptions = {}

export const makeScannerFromSubscriptions = <Fact>(
  plan: (context: ProgramMatchContext) => ReadonlyArray<Subscription<Fact>>
) => new Scanner<Fact>({ plan, compilerOptions: emptyCompilerOptions })
