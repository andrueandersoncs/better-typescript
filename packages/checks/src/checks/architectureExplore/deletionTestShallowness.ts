import { Array, Function, Result, pipe } from "effect"
import { Advice } from "@better-typescript/core/engine/derive/data"
import { adviceLocation, deriveSignals, evidenceItem } from "@better-typescript/core/engine/derive"
import type { NamedDetection } from "@better-typescript/core/engine/derive/data"
import { isDeletableWrapper, passThroughDataOf } from "./evidence.js"

const deletionAdvice = (elements: ReadonlyArray<NamedDetection>): ReadonlyArray<Advice> => {
  const wrappers = pipe(
    elements,
    Array.filter((element) => element.name === "pass-through-wrappers"),
    Array.filter(isDeletableWrapper)
  )

  const paths = pipe(
    wrappers,
    Array.map((element) => element.detection.location.path),
    Array.dedupe
  )

  return Array.map(paths, (filePath) => {
    const atPath = Array.filter(wrappers, (element) => element.detection.location.path === filePath)

    const callerCount = pipe(
      atPath,
      Array.filterMap(Function.flow(passThroughDataOf, Result.fromOption(Function.constVoid))),
      Array.reduce(0, (total, data) => total + data.callerCount)
    )

    const forwardersItem = evidenceItem("deletable-forwarders", atPath.length)
    const callersItem = evidenceItem("production-callers", callerCount)
    const evidence = Array.make(forwardersItem, callersItem)
    const location = adviceLocation(filePath)

    return new Advice({
      location,
      level: "file",
      title: "deletion-test shallowness",
      remediation:
        "Deleting these exact forwarders removes indirection without spreading policy across production callers. " +
        "Inline the one-use operation or collapse the re-export into the intended public interface; keep a Module " +
        "when behaviour would reappear across multiple callers.",
      evidence
    })
  })
}

export const deletionTestShallowness = deriveSignals(deletionAdvice)
