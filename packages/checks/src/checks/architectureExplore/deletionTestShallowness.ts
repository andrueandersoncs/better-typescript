import { Array, Function, Option, Struct, pipe } from "effect"
import { Advice } from "@better-typescript/core/engine/derive/data"
import { adviceLocation, deriveSignals, evidenceItem } from "@better-typescript/core/engine/derive"
import type { NamedDetection } from "@better-typescript/core/engine/derive/data"
import type { NonEmptyRefactorExamples } from "@better-typescript/core/engine/example/data"
import { fixtureRefactorExamples } from "../../fixtureExamples.js"
import {
  compositionForwarderDataOf,
  isDeletableShallowness,
  isShallownessName,
  passThroughDataOf
} from "./evidence.js"

export const deletionTestShallownessExamples: NonEmptyRefactorExamples = fixtureRefactorExamples(
  "deletion-test-shallowness"
)

const callerCountOf = (element: NamedDetection): number =>
  pipe(
    passThroughDataOf(element),
    Option.map(Struct.get("callerCount")),
    Option.orElse(() =>
      pipe(compositionForwarderDataOf(element), Option.map(Struct.get("callerCount")))
    ),
    Option.getOrElse(Function.constant(0))
  )

const deletionAdvice = (elements: ReadonlyArray<NamedDetection>): ReadonlyArray<Advice> => {
  const wrappers = pipe(
    elements,
    Array.filter((element) => isShallownessName(element.name)),
    Array.filter(isDeletableShallowness)
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
      Array.map(callerCountOf),
      Array.reduce(0, (total, count) => total + count)
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
      evidence,
      examples: deletionTestShallownessExamples
    })
  })
}

export const deletionTestShallowness = deriveSignals(deletionAdvice)
