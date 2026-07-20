import { Array, Option, pipe, Result, Function } from "effect"
import { Advice } from "@better-typescript/core/engine/derive/data"
import {
  makeAdviceLocation,
  deriveSignals,
  makeEvidenceItem
} from "@better-typescript/core/engine/derive"
import type { NamedDetection } from "@better-typescript/core/engine/derive/data"
import { packageExamples } from "../../defineCheck.js"
import { interfaceBurdenDataOf, isDeletableShallowness, isShallownessName } from "./evidence.js"
import { interfaceBurdenName } from "./names.js"

export const wideShallowInterfaceExamples = packageExamples("wide-shallow-interface")

const minimumForwarders = 3

const wideShallowAdvice = (elements: ReadonlyArray<NamedDetection>): ReadonlyArray<Advice> => {
  const isInterfaceBurdenElement = (element: NamedDetection) => element.name === interfaceBurdenName
  const elementHasShallownessName = (element: NamedDetection) => isShallownessName(element.name)
  const burden = Array.filter(elements, isInterfaceBurdenElement)

  const wrappers = pipe(
    elements,
    Array.filter(elementHasShallownessName),
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
        const location = makeAdviceLocation(filePath)
        const operationsItem = makeEvidenceItem("interface-operations", data.operationCount)
        const parametersItem = makeEvidenceItem("required-parameters", data.requiredParameterCount)
        const forwardersItem = makeEvidenceItem("deletable-forwarders", forwarders.length)
        const evidence = Array.make(operationsItem, parametersItem, forwardersItem)
        const examples = wideShallowInterfaceExamples

        return Advice.make({
          location,
          level: "file",
          title: "wide shallow interface",
          remediation:
            "This public interface carries many operations while most of its surface is low-leverage forwarding. " +
            "Collapse the forwarders and expose the smaller domain operation that hides configuration, ordering, and adapter details.",
          evidence,
          examples
        })
      }),
      Result.fromOption(Function.constVoid)
    )
  })
}

export const wideShallowInterface = deriveSignals(wideShallowAdvice)
