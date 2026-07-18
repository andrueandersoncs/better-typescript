import { Array, pipe } from "effect"
import { makeWiring } from "@better-typescript/core/engine/wiring"
import type { NamedCheck } from "@better-typescript/core/engine/wiring/data"
import { architectureExploreCoreChecks } from "./architectureExploreCoreChecks.js"
import { architectureExploreOopChecks } from "./architectureExploreOopChecks.js"
import { architectureExploreFpChecks } from "./architectureExploreFpChecks.js"
import { architectureExploreDerive } from "./architectureExploreDerive.js"

export const architectureExploreChecks: ReadonlyArray<NamedCheck> = pipe(
  architectureExploreCoreChecks,
  Array.appendAll(architectureExploreOopChecks),
  Array.appendAll(architectureExploreFpChecks)
)

export const architectureExploreWiring = makeWiring({
  checks: architectureExploreChecks,
  derive: architectureExploreDerive
})

// The OOP fleet composes neutral and constructor-shaped evidence because users opt into paradigms.
const architectureExploreOopFleetChecks = Array.appendAll(
  architectureExploreCoreChecks,
  architectureExploreOopChecks
)

export const architectureExploreOopWiring = makeWiring({
  checks: architectureExploreOopFleetChecks,
  derive: architectureExploreDerive
})

// The FP fleet composes neutral and composition-shaped evidence because users opt into paradigms.
const architectureExploreFpFleetChecks = Array.appendAll(
  architectureExploreCoreChecks,
  architectureExploreFpChecks
)

export const architectureExploreFpWiring = makeWiring({
  checks: architectureExploreFpFleetChecks,
  derive: architectureExploreDerive
})
