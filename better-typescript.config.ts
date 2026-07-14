import { Stream, pipe } from "effect"
import { makeWiring } from "@better-typescript/core/engine/report"
import { defaultWiring } from "@better-typescript/checks/preset/defaultWiring"
import {
  architectureExploreChecks,
  architectureExploreDerive
} from "@better-typescript/checks/preset/architectureExploreWiring"
import { functionalCoreEffectWiring } from "@better-typescript/checks/preset/functionalCoreEffectWiring"

// Self-host with the default Effect fleet plus both opt-in architecture fleets.
// Keep the architecture presets separate so consumers can choose either policy;
// this repository composes both to exercise their integration continuously.
export default makeWiring({
  checks: [
    ...defaultWiring.checks,
    ...architectureExploreChecks,
    ...functionalCoreEffectWiring.checks
  ],
  derive: (signals) =>
    pipe(
      defaultWiring.derive(signals),
      Stream.concat(architectureExploreDerive(signals)),
      Stream.concat(functionalCoreEffectWiring.derive(signals))
    )
})
