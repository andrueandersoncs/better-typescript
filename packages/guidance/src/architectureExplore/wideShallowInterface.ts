import { Array, Option, pipe, Result, Function, Struct, flow } from "effect"
import { strictEqual } from "@better-typescript/matchers/equivalence"
import { Advice, EvidenceItem } from "@better-typescript/core/engine/derive/data"
import { deriveSignals } from "@better-typescript/core/engine/derive"
import type { NamedDetection } from "@better-typescript/core/engine/derive/data"
import { Location } from "@better-typescript/core/engine/location/data"
import { makePackageExamples } from "../definePolicy.js"
import { interfaceBurdenDataOf, isDeletableShallowness, isShallownessName } from "./evidence.js"
import { interfaceBurdenName } from "./names.js"

export const wideShallowInterfaceExamples = makePackageExamples("wide-shallow-interface")

const minimumForwarders = 3

const wideShallowAdvice = (elements: ReadonlyArray<NamedDetection>): ReadonlyArray<Advice> => {
  const isInterfaceBurdenElement = flow(
    Struct.get<NamedDetection, "name">("name"),
    strictEqual(interfaceBurdenName)
  )

  const elementHasShallownessName = (element: NamedDetection) => isShallownessName(element.name)
  const burden = Array.filter(elements, isInterfaceBurdenElement)

  const wrappers = pipe(
    elements,
    Array.filter(elementHasShallownessName),
    Array.filter(isDeletableShallowness)
  )

  return Array.filterMap(burden, (burdenElement) => {
    const filePath = burdenElement.detection.location.path

    const hasPath = (element: NamedDetection) =>
      strictEqual(filePath)(element.detection.location.path)

    const forwarders = Array.filter(wrappers, hasPath)

    if (forwarders.length < minimumForwarders) {
      return Result.failVoid
    }

    return pipe(
      interfaceBurdenDataOf(burdenElement),
      Option.filter((data) => forwarders.length * 2 > data.operationCount),
      Option.map((data) => {
        const location = Location.make({ path: filePath })

        const operationsItem = EvidenceItem.make({
          measure: "interface-operations",
          count: data.operationCount
        })

        const parametersItem = EvidenceItem.make({
          measure: "required-parameters",
          count: data.requiredParameterCount
        })

        const forwardersItem = EvidenceItem.make({
          measure: "deletable-forwarders",
          count: forwarders.length
        })

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
