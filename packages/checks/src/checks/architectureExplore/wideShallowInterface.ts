import { Array, Option, pipe, Result, Function } from "effect"
import { Advice } from "@better-typescript/core/engine/derive/data"
import { adviceLocation, deriveSignals, evidenceItem } from "@better-typescript/core/engine/derive"
import type { NamedDetection } from "@better-typescript/core/engine/derive/data"
import type { NonEmptyRefactorExamples } from "@better-typescript/core/engine/example/data"
import { fixtureRefactorExamples } from "../../fixtureExamples.js"
import { interfaceBurdenDataOf, isDeletableShallowness, isShallownessName } from "./evidence.js"
import { interfaceBurdenName } from "./names.js"

export const wideShallowInterfaceExamples: NonEmptyRefactorExamples =
  fixtureRefactorExamples("wide-shallow-interface")

const minimumForwarders = 3

const wideShallowAdvice = (elements: ReadonlyArray<NamedDetection>): ReadonlyArray<Advice> => {
  const burden = Array.filter(elements, (element) => element.name === interfaceBurdenName)

  const wrappers = pipe(
    elements,
    Array.filter((element) => isShallownessName(element.name)),
    Array.filter(isDeletableShallowness)
  )

  return Array.filterMap(burden, (burdenElement) => {
    const filePath = burdenElement.detection.location.path

    const forwarders = Array.filter(
      wrappers,
      (element) => element.detection.location.path === filePath
    )

    if (forwarders.length < minimumForwarders) {
      return Result.failVoid
    }

    return pipe(
      interfaceBurdenDataOf(burdenElement),
      Option.filter((data) => forwarders.length * 2 > data.operationCount),
      Option.map((data) => {
        const location = adviceLocation(filePath)
        const operationsItem = evidenceItem("interface-operations", data.operationCount)
        const parametersItem = evidenceItem("required-parameters", data.requiredParameterCount)
        const forwardersItem = evidenceItem("deletable-forwarders", forwarders.length)
        const evidence = Array.make(operationsItem, parametersItem, forwardersItem)

        return new Advice({
          location,
          level: "file",
          title: "wide shallow interface",
          remediation:
            "This public interface carries many operations while most of its surface is low-leverage forwarding. " +
            "Collapse the forwarders and expose the smaller domain operation that hides configuration, ordering, and adapter details.",
          evidence,
          examples: wideShallowInterfaceExamples
        })
      }),
      Result.fromOption(Function.constVoid)
    )
  })
}

export const wideShallowInterface = deriveSignals(wideShallowAdvice)
