import type { LoadedProject } from "../project/loadProject.js"
import type { Rule, RuleMatch } from "../rules/index.js"
import { compileRules } from "./compileRules.js"

export const runRules = (
  loadedProject: LoadedProject,
  rules: ReadonlyArray<Rule>
): ReadonlyArray<RuleMatch> => {
  const checker = loadedProject.program.getTypeChecker()
  const checkSourceFile = compileRules(rules)

  return loadedProject.program
    .getSourceFiles()
    .filter((sourceFile) => !shouldSkipSourceFile(sourceFile.fileName, sourceFile.isDeclarationFile))
    .flatMap((sourceFile) =>
      checkSourceFile({
        program: loadedProject.program,
        checker,
        projectRoot: loadedProject.rootPath,
        sourceFile
      })
    )
}

export const shouldSkipSourceFile = (fileName: string, isDeclarationFile: boolean): boolean =>
  isDeclarationFile || fileName.replaceAll("\\", "/").includes("/node_modules/")
