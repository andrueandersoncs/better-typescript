import type { Wiring } from "@better-typescript/core/engine/wiring/wiringClass"
import type { WiringPolicy } from "@better-typescript/core/engine/wiring/wiringPolicy"
import { makeWiring } from "@better-typescript/core/engine/wiring/makeWiring"
import { Effect } from "effect"

export const noDerive: Wiring["derive"] = () => Effect.succeed([])

export const testWiring = (
  policies: ReadonlyArray<WiringPolicy>,
  derive: Wiring["derive"] = noDerive
): Wiring => makeWiring({ policies, derive })
