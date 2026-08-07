import { Data } from "effect"
import * as ts from "typescript"
import { BindingCounter } from "./bindingCounter.js"

// ImportRecord preserves declaration order because emitted evidence must match source order.
export class ImportRecord extends Data.Class<{
  readonly declaration: ts.ImportDeclaration
  readonly specifier: string
  readonly counters: ReadonlyArray<BindingCounter>
}> {
  // Specifier text is evidence identity because ImportUsageData joins on the raw module path.
  get moduleSpecifier(): string {
    return this.specifier
  }
}
