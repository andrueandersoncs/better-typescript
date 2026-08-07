import { PassThroughWrapperData } from "@better-typescript/matchers/builtins/passThroughWrappers"

export const wrapperData = (
  callerCount: number,
  hasNonCallReference = false
): PassThroughWrapperData =>
  PassThroughWrapperData.make({
    kind: "forwarding-call",
    exportCount: 1,
    callerCount,
    callerPaths: callerCount === 0 ? [] : ["src/caller.ts"],
    hasNonCallReference
  })
