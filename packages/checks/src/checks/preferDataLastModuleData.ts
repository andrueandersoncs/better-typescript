import { Data } from "effect"
import type * as ts from "typescript"

export class FunctionDefinition extends Data.Class<{
  readonly name: string
  readonly reportNode: ts.Node
}> {}

export class DataStructureModule extends Data.Class<{
  readonly name: string
  readonly expectedModulePath: string
}> {}
