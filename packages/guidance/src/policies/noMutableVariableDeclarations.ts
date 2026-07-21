import { Function } from "effect"
import type { Match } from "@better-typescript/matchers/matcher/data"
import { oneFinding } from "@better-typescript/core/engine/policy"
import { defineBuiltinPolicy } from "../definePolicy.js"
import {
  noMutableVariableDeclarationsMatcher,
  type NoMutableVariableDeclarationsFact
} from "@better-typescript/matchers/builtins/noMutableVariableDeclarations"

const hint =
  "Declare multiple const values to represent each state instead of mutating a single " +
  "variable, and use immutable values that are not reassigned. When the value must " +
  "genuinely evolve over time (a module-level counter, a cell shared across " +
  "closures), hold it in a Ref inside the Effect runtime instead of a let binding."

const noMutableVariableDeclarationsFindings = (match: Match<NoMutableVariableDeclarationsFact>) =>
  oneFinding(
    match.target,
    `Avoid declaring mutable variables with ${match.fact.kind}.`,
    hint,
    undefined
  )

export const noMutableVariableDeclarations = defineBuiltinPolicy(
  "no-mutable-variable-declarations",
  noMutableVariableDeclarationsMatcher,
  Function.constant(noMutableVariableDeclarationsFindings)
)
