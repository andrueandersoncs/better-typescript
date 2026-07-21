import { Array, Function, Option, Struct, pipe } from "effect"
import { strictEqual } from "@better-typescript/core/engine/equivalence"
import { Advice } from "@better-typescript/core/engine/derive/data"
import {
  makeAdviceLocation,
  deriveSignals,
  makeEvidenceItem
} from "@better-typescript/core/engine/derive"
import type { NamedDetection } from "@better-typescript/core/engine/derive/data"
import { packageExamples } from "../../defineCheck.js"
import {
  compositionForwarderDataOf,
  isDeletableShallowness,
  isShallownessName,
  passThroughDataOf
} from "./evidence.js"

export const deletionTestShallownessExamples = packageExamples("deletion-test-shallowness")

const callerCountOf = (element: NamedDetection) =>
  pipe(
    passThroughDataOf(element),
    Option.map(Struct.get("callerCount")),
    Option.orElse(() =>
      pipe(compositionForwarderDataOf(element), Option.map(Struct.get("callerCount")))
    ),
    Option.getOrElse(Function.constant(0))
  )

const deletionAdvice = (elements: ReadonlyArray<NamedDetection>): ReadonlyArray<Advice> => {
  const elementHasShallownessName = (element: NamedDetection) => isShallownessName(element.name)
  const detectionPath = (element: NamedDetection) => element.detection.location.path

  const wrappers = pipe(
    elements,
    Array.filter(elementHasShallownessName),
    Array.filter(isDeletableShallowness)
  )

  const paths = pipe(wrappers, Array.map(detectionPath), Array.dedupe)

  return Array.map(paths, (filePath) => {
    const hasPath = (element: NamedDetection) =>
      strictEqual(filePath)(element.detection.location.path)

    const atPath = Array.filter(wrappers, hasPath)

    const callerCount = pipe(
      atPath,
      Array.map(callerCountOf),
      Array.reduce(0, (total, count) => total + count)
    )

    const forwardersItem = makeEvidenceItem("deletable-forwarders", atPath.length)
    const callersItem = makeEvidenceItem("production-callers", callerCount)
    const evidence = Array.make(forwardersItem, callersItem)
    const location = makeAdviceLocation(filePath)
    const examples = deletionTestShallownessExamples

    return Advice.make({
      location,
      level: "file",
      title: "deletion-test shallowness",
      remediation:
        "Deleting these exact forwarders removes indirection without spreading policy across production callers. " +
        "Inline the one-use operation or collapse the re-export into the intended public interface; keep a Module " +
        "when behaviour would reappear across multiple callers.",
      evidence,
      examples
    })
  })
}

export const deletionTestShallowness = deriveSignals(deletionAdvice)
