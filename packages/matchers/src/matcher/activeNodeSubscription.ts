import * as ts from "typescript"
import { Data, MutableList } from "effect"
import { Match } from "./match.js"

// ActiveNodeSubscription binds one planned handler because fused dispatch mutates its buffer.
export class ActiveNodeSubscription extends Data.Class<{
  readonly matcherIndex: number
  readonly handler: (node: ts.Node) => ReadonlyArray<Match<unknown>>
  readonly matches: MutableList.MutableList<Match<unknown>>
}> {}
