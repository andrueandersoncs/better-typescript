import { Array, Option, pipe } from "effect"
import { Advice } from "@better-typescript/core/engine/derive/data"
import { adviceLocation, deriveSignals, evidenceItem } from "@better-typescript/core/engine/derive"
import type { NamedDetection } from "@better-typescript/core/engine/derive/data"
import { interfaceBurdenDataOf, isDeletableWrapper } from "./evidence.js"

const minimumForwarders = 3

const wideShallowAdvice = (elements: ReadonlyArray<NamedDetection>): ReadonlyArray<Advice> => {
  const burden = Array.filter(elements, (element) => element.name === "interface-burden")

  const wrappers = pipe(
    elements,
    Array.filter((element) => element.name === "pass-through-wrappers"),
    Array.filter(isDeletableWrapper)
  )

  return Array.filterMap(burden, (burdenElement) => {
    const filePath = burdenElement.detection.location.path

    const forwarders = Array.filter(
      wrappers,
      (element) => element.detection.location.path === filePath
    )

    if (forwarders.length < minimumForwarders) {
      return Option.none()
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
          evidence
        })
      })
    )
  })
}

export const wideShallowInterface = deriveSignals(wideShallowAdvice)
