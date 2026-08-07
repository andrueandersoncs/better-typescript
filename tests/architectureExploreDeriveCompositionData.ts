import { CompositionForwarderData } from "@better-typescript/matchers/builtins/compositionForwarders"

export const compositionData = (
  callerCount: number,
  hasNonCallReference = false
): CompositionForwarderData =>
  CompositionForwarderData.make({
    exportName: "forward",
    stepCount: 2,
    callerCount,
    callerPaths: callerCount === 0 ? [] : ["src/caller.ts"],
    hasNonCallReference
  })
