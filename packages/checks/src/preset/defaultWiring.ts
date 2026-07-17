import { Array, Effect, flow, pipe } from "effect"
import { effectIdiomChecks } from "./effectIdiomChecks.js"
import { conceptAndCompositionChecks } from "./conceptAndCompositionChecks.js"
import { errorHygieneChecks } from "./errorHygieneChecks.js"
import { commentAndDeclarationChecks } from "./commentAndDeclarationChecks.js"
import { expressionAndMutationChecks } from "./expressionAndMutationChecks.js"
import { controlFlowChecks } from "./controlFlowChecks.js"
import { dispatchAndCollectionChecks } from "./dispatchAndCollectionChecks.js"
import { defaultDerive } from "./defaultDerive.js"
import { defineConfig, makeWiring } from "@better-typescript/core/engine/wiring"
import { WiringEntry, type Wiring } from "@better-typescript/core/engine/wiring/data"

export { defaultDerive }

// Category concatenation order is pinned because report block order is a public contract.
export const defaultChecks = pipe(
  effectIdiomChecks,
  Array.appendAll(conceptAndCompositionChecks),
  Array.appendAll(errorHygieneChecks),
  Array.appendAll(commentAndDeclarationChecks),
  Array.appendAll(expressionAndMutationChecks),
  Array.appendAll(controlFlowChecks),
  Array.appendAll(dispatchAndCollectionChecks),
  Effect.all
)

export const defaultWiring = pipe(
  Effect.all({
    checks: defaultChecks,
    derive: defaultDerive
  }),
  Effect.map(makeWiring)
)

const defaultFiles = Array.of("**/*")

const defaultConfigFromWiring = flow(
  (wiring: Wiring) =>
    new WiringEntry({
      files: defaultFiles,
      wiring
    }),
  Array.of,
  defineConfig
)

export const defaultConfig = pipe(defaultWiring, Effect.map(defaultConfigFromWiring))
