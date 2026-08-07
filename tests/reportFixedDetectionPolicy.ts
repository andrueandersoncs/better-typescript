import { Array } from "effect"
import { type Detection } from "@better-typescript/core/engine/location/detectionData"
import { type Policy } from "@better-typescript/core/engine/policy/policyClass"
import { makePolicy } from "@better-typescript/core/engine/policy/makePolicy"
import { makeSilentPolicy } from "@better-typescript/core/engine/policy/makeSilentPolicy"
import { makeFindings } from "@better-typescript/core/engine/policy/makeFindings"
import { fileMatcher } from "@better-typescript/matchers/matcher/fileMatcher"
import { PositionTarget } from "@better-typescript/matchers/matcher/positionTarget"
import { makeFileMatch } from "@better-typescript/matchers/builtins/exportSurface"
import { probeExamples } from "./reportProbeExamples.js"
import { syntheticSourceFile } from "./reportSyntheticSourceFile.js"

export const fixedDetectionPolicy = (
  name: string,
  elements: ReadonlyArray<Detection>,
  examples = probeExamples,
  reported = true
): Policy => {
  const matcher = fileMatcher((context) => {
    if (elements.length === 0) return []
    const projectFiles = context.program
      .getSourceFiles()
      .filter((file) => !file.isDeclarationFile && !file.fileName.includes("node_modules"))
    return projectFiles[0] === context.sourceFile
      ? (() => {
          const match = makeFileMatch(context.sourceFile, elements)
          return Array.of(match)
        })()
      : []
  })
  const guidance =
    (context: { readonly projectRoot: string }) =>
    (match: { readonly fact: ReadonlyArray<Detection> }) =>
      match.fact.flatMap((element) =>
        makeFindings(
          new PositionTarget({
            sourceFile: syntheticSourceFile(context, element.location.path),
            line: element.location.line ?? 1,
            column: element.location.column ?? 1
          }),
          element.message,
          element.hint,
          element.data
        )
      )
  return reported
    ? makePolicy({ name, matcher, guidance: guidance as any, examples })
    : makeSilentPolicy({ name, matcher, guidance: guidance as any, examples })
}
