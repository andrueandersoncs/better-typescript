import { type Policy } from "@better-typescript/core/engine/policy/policyClass"
import { makeSilentPolicy } from "@better-typescript/core/engine/policy/makeSilentPolicy"
import { makeFindings } from "@better-typescript/core/engine/policy/makeFindings"
import { emptyRefactorExampleSource } from "@better-typescript/core/engine/example/examplesFromDefinition"
import { fileMatcher } from "@better-typescript/matchers/matcher/fileMatcher"
import { PositionTarget } from "@better-typescript/matchers/matcher/positionTarget"
import { makeFileMatch } from "@better-typescript/matchers/builtins/exportSurface"
import { syntheticSourceFile } from "./reportSyntheticSourceFile.js"
import { unit } from "./reportUnit.js"

export const silentProbeNamedPolicy: Policy = makeSilentPolicy({
  name: "silent-only probe",
  matcher: fileMatcher((context) => {
    const projectFiles = context.program
      .getSourceFiles()
      .filter((file) => !file.isDeclarationFile && !file.fileName.includes("node_modules"))
    if (projectFiles[0] !== context.sourceFile) return []
    const match = makeFileMatch(context.sourceFile, unit)
    return [match]
  }),
  guidance: (context) => () =>
    makeFindings(
      new PositionTarget({
        sourceFile: syntheticSourceFile(context, "src/silent-observation.ts"),
        line: 1,
        column: 1
      }),
      "silent observation",
      "silent observations only feed advice",
      unit
    ),
  examples: emptyRefactorExampleSource
})
