import { HashMap, MutableRef, Option } from "effect"
import type * as ts from "typescript"
import type { ReferenceKey } from "../support/referenceKeyType.js"
import type { SymbolReference } from "./symbolReference.js"

// The dependency cache retains one checker because project analysis is sequential.
const emptyDependencyCache =
  Option.none<
    readonly [ts.TypeChecker, HashMap.HashMap<ReferenceKey, ReadonlyArray<SymbolReference>>]
  >()

export const functionDependencyCache = MutableRef.make(emptyDependencyCache)
