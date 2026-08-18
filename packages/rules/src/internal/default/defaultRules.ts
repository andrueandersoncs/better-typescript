import { Array, Record, pipe } from "effect"
import type { Rule } from "@better-typescript/core/linter"
import { commentAndDeclarationRules } from "./commentAndDeclarationRules.js"
import { conceptAndCompositionRules } from "./conceptAndCompositionRules.js"
import { controlFlowRules } from "./controlFlowRules.js"
import { dispatchAndCollectionRules } from "./dispatchAndCollectionRules.js"
import { effectIdiomRules } from "./effectIdiomRules.js"
import { errorHygieneRules } from "./errorHygieneRules.js"
import { expressionAndMutationRules } from "./expressionAndMutationRules.js"
import { semanticNamingRules } from "./semanticNamingRules.js"

const categories = {
  effectIdiomRules,
  commentAndDeclarationRules,
  conceptAndCompositionRules,
  controlFlowRules,
  semanticNamingRules,
  errorHygieneRules,
  expressionAndMutationRules,
  dispatchAndCollectionRules
}

export const defaultRules: ReadonlyArray<Rule> = pipe(categories, Record.values, Array.flatten)
