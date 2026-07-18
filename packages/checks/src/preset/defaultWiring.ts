import { Array, pipe } from "effect"
import { effectIdiomChecks } from "./effectIdiomChecks.js"
import { conceptAndCompositionChecks } from "./conceptAndCompositionChecks.js"
import { errorHygieneChecks } from "./errorHygieneChecks.js"
import { commentAndDeclarationChecks } from "./commentAndDeclarationChecks.js"
import { expressionAndMutationChecks } from "./expressionAndMutationChecks.js"
import { controlFlowChecks } from "./controlFlowChecks.js"
import { dispatchAndCollectionChecks } from "./dispatchAndCollectionChecks.js"
import { defaultDerive } from "./defaultDerive.js"
import { semanticNamingChecks } from "./semanticNamingChecks.js"
import { defineConfig, makeWiring } from "@better-typescript/core/engine/wiring"
import type { NamedCheck, WiringConfig } from "@better-typescript/core/engine/wiring/data"

// Category concatenation order is pinned because report block order is a public contract.
const defaultChecks: ReadonlyArray<NamedCheck> = pipe(
  effectIdiomChecks,
  Array.appendAll(conceptAndCompositionChecks),
  Array.appendAll(semanticNamingChecks),
  Array.appendAll(errorHygieneChecks),
  Array.appendAll(commentAndDeclarationChecks),
  Array.appendAll(expressionAndMutationChecks),
  Array.appendAll(controlFlowChecks),
  Array.appendAll(dispatchAndCollectionChecks)
)

export const defaultWiring = makeWiring({ checks: defaultChecks, derive: defaultDerive })

const defaultFiles = Array.of("**/*")

const defaultConfigEntries = Array.of({
  files: defaultFiles,
  wiring: defaultWiring
})

export const defaultConfig: WiringConfig = defineConfig(defaultConfigEntries)
