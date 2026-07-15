import { Option, Schema, pipe } from "effect"
import type { NamedDetection } from "@better-typescript/core/engine/derive/data"
import {
  ExternalDependencyConstructionData,
  InterfaceBurdenData,
  ModuleGraphData,
  PassThroughWrapperData,
  SeamLeakageData,
  SingleAdapterSeamData,
  TestOnlyExportData
} from "./data.js"

const checkedData = <A>(
  guard: (input: unknown) => input is A,
  element: NamedDetection
): Option.Option<A> => {
  const data = element.detection.data

  return guard(data) ? Option.some(data) : Option.none()
}

export const passThroughDataOf = (element: NamedDetection): Option.Option<PassThroughWrapperData> =>
  checkedData(Schema.is(PassThroughWrapperData), element)

export const interfaceBurdenDataOf = (
  element: NamedDetection
): Option.Option<InterfaceBurdenData> => checkedData(Schema.is(InterfaceBurdenData), element)

export const moduleGraphDataOf = (element: NamedDetection): Option.Option<ModuleGraphData> =>
  checkedData(Schema.is(ModuleGraphData), element)

export const testOnlyExportDataOf = (element: NamedDetection): Option.Option<TestOnlyExportData> =>
  checkedData(Schema.is(TestOnlyExportData), element)

export const seamLeakageDataOf = (element: NamedDetection): Option.Option<SeamLeakageData> =>
  checkedData(Schema.is(SeamLeakageData), element)

export const externalDependencyDataOf = (
  element: NamedDetection
): Option.Option<ExternalDependencyConstructionData> =>
  checkedData(Schema.is(ExternalDependencyConstructionData), element)

export const singleAdapterDataOf = (
  element: NamedDetection
): Option.Option<SingleAdapterSeamData> => checkedData(Schema.is(SingleAdapterSeamData), element)

export const isDeletableWrapper = (element: NamedDetection): boolean =>
  pipe(
    passThroughDataOf(element),
    Option.exists((data) => {
      const hasAtMostOneCaller = data.callerCount <= 1
      const hasOnlyCallReferences = !data.hasNonCallReference

      return hasAtMostOneCaller && hasOnlyCallReferences
    })
  )
