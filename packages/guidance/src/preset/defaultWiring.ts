import { Array, pipe } from "effect"
import { effectIdiomPolicies } from "./effectIdiomPolicies.js"
import { conceptAndCompositionPolicies } from "./conceptAndCompositionPolicies.js"
import { errorHygienePolicies } from "./errorHygienePolicies.js"
import { commentAndDeclarationPolicies } from "./commentAndDeclarationPolicies.js"
import { expressionAndMutationPolicies } from "./expressionAndMutationPolicies.js"
import { controlFlowPolicies } from "./controlFlowPolicies.js"
import { dispatchAndCollectionPolicies } from "./dispatchAndCollectionPolicies.js"
import { defaultDerive } from "./defaultDerive.js"
import { semanticNamingPolicies } from "./semanticNamingPolicies.js"
import { defineConfig, makeWiring } from "@better-typescript/core/engine/wiring"
import type { Policy } from "@better-typescript/core/engine/policy/data"

// Category concatenation order is pinned because report block order is a public contract.
const defaultPolicies: ReadonlyArray<Policy> = pipe(
  effectIdiomPolicies,
  Array.appendAll(commentAndDeclarationPolicies),
  Array.appendAll(conceptAndCompositionPolicies),
  Array.appendAll(controlFlowPolicies),
  Array.appendAll(semanticNamingPolicies),
  Array.appendAll(errorHygienePolicies),
  Array.appendAll(expressionAndMutationPolicies),
  Array.appendAll(dispatchAndCollectionPolicies)
)

export const defaultWiring = makeWiring({ policies: defaultPolicies, derive: defaultDerive })

const defaultFiles = Array.of("**/*")

const defaultConfigEntries = Array.of({
  files: defaultFiles,
  wiring: defaultWiring
})

export const defaultConfig = defineConfig(defaultConfigEntries)
