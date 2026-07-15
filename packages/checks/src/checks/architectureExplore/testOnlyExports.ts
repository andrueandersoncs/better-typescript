import { Array, Function, Option, pipe } from "effect"
import { fileSubscriptions, withProgramIndex } from "@better-typescript/core/engine/check"
import { detection } from "@better-typescript/core/engine/location"
import type { CheckContext } from "@better-typescript/core/engine/check/data"
import type { Check } from "@better-typescript/core/engine/check/data"
import type { Detection } from "@better-typescript/core/engine/location/data"

import { TestOnlyExportData } from "./data.js"
import {
  ExportReferenceIndex,
  buildExportReferenceIndex,
  isTestSourceFile,
  usageFor
} from "./programSymbols.js"

const message =
  "Test-only export evidence — production exposes this callable only so tests can reach implementation."

const hint =
  "Test through the same public interface as production callers, then make this internal helper private."

const testOnlyExportElements =
  (index: ExportReferenceIndex) =>
  (context: CheckContext): ReadonlyArray<Detection> => {
    if (isTestSourceFile(context.projectRoot)(context.sourceFile)) {
      return Array.empty()
    }

    const element = detection(context)

    return pipe(
      index.entries,
      Array.filter((entry) => entry.nameNode.getSourceFile() === context.sourceFile),
      Array.filterMap((entry) => {
        const usage = usageFor(index)(entry)
        const hasTestUse = usage.testPaths.length > 0
        const hasProductionUse = usage.productionPaths.length > 0
        const hasNoProductionUse = !hasProductionUse
        const isTestOnly = hasTestUse && hasNoProductionUse

        if (!isTestOnly) {
          return Option.none()
        }

        const data = new TestOnlyExportData({
          testPaths: usage.testPaths,
          testCallCount: usage.testCallCount
        })

        const reported = element({
          node: entry.nameNode,
          message,
          hint,
          data
        })

        return Option.some(reported)
      })
    )
  }

const testOnlyExportSubscriptions = Function.compose(testOnlyExportElements, fileSubscriptions)

export const testOnlyExports: Check = withProgramIndex(buildExportReferenceIndex)(
  testOnlyExportSubscriptions
)
