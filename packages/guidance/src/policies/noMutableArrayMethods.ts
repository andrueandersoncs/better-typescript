import { Function } from "effect"
import type { Match } from "@better-typescript/matchers/matcher/data"
import { oneFinding } from "@better-typescript/core/engine/policy"
import { defineBuiltinPolicy } from "../definePolicy.js"
import {
  noMutableArrayMethodsMatcher,
  type NoMutableArrayMethodsFact
} from "@better-typescript/matchers/builtins/noMutableArrayMethods"

const hint =
  "This is a sign that you're doing something fundamentally procedural when you should " +
  "be taking a more functional approach. Use Effect's Array module, such as " +
  "Array.append(), Array.map(), Array.filter(), Array.sort(), or spread syntax " +
  "instead of manipulating an array in place."

const noMutableArrayMethodsFindings = (match: Match<NoMutableArrayMethodsFact>) =>
  oneFinding(
    match.target,
    `Avoid mutating arrays with Array.prototype.${match.fact.methodName}().`,
    hint,
    undefined
  )

export const noMutableArrayMethods = defineBuiltinPolicy(
  "no-mutable-array-methods",
  noMutableArrayMethodsMatcher,
  Function.constant(noMutableArrayMethodsFindings)
)
