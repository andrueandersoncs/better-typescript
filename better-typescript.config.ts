import { Stream, pipe } from "effect"
import { makeWiring } from "@better-typescript/core/engine/report"
import { defaultWiring } from "@better-typescript/checks/preset/defaultWiring"
import {
  architectureExploreChecks,
  architectureExploreDerive
} from "@better-typescript/checks/preset/architectureExploreWiring"

// Self-host with the default Effect fleet plus Architecture Explore.
// Keep architectureExploreWiring as a separate fragment so consumers can
// still import defaultWiring alone; this repo opts into both here.
export default makeWiring({
  checks: [...defaultWiring.checks, ...architectureExploreChecks],
  derive: (signals) =>
    pipe(
      defaultWiring.derive(signals),
      Stream.concat(architectureExploreDerive(signals))
    )
})
