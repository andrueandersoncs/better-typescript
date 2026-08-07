import * as ts from "typescript"
import { CallableSemantics } from "./callableSemanticsClass.js"
import { Data, HashMap, Option } from "effect"

// CallableSemanticsCache retains one Program because workspace projects are analyzed sequentially.
export class CallableSemanticsCache extends Data.Class<{
  readonly program: ts.Program
  readonly entries: HashMap.HashMap<string, Option.Option<CallableSemantics>>
}> {}
