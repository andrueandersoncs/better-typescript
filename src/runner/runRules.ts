import type * as ts from "typescript"
import type { LoadedProject } from "../project/loadProject.js"
import { RuleContext } from "../rules/index.js"
import type { Rule, RuleMatch } from "../rules/index.js"
import { compileRules } from "./compileRules.js"

const isCheckableSourceFile = (sourceFile: ts.SourceFile): boolean =>
  !shouldSkipSourceFile(sourceFile.fileName, sourceFile.isDeclarationFile)

const contextForSourceFile =
  (loadedProject: LoadedProject, checker: ts.TypeChecker) =>
  (sourceFile: ts.SourceFile): RuleContext =>
    new RuleContext({
      program: loadedProject.program,
      checker,
      projectRoot: loadedProject.rootPath,
      sourceFile
    })

export const runRules = (
  loadedProject: LoadedProject,
  rules: ReadonlyArray<Rule>
): ReadonlyArray<RuleMatch> => {
  const checker = loadedProject.program.getTypeChecker()
  const checkSourceFile = compileRules(rules)

  return loadedProject.program
    .getSourceFiles()
    .filter(isCheckableSourceFile)
    .map(contextForSourceFile(loadedProject, checker))
    .flatMap(checkSourceFile)
}

export const shouldSkipSourceFile = (fileName: string, isDeclarationFile: boolean): boolean =>
  isDeclarationFile || fileName.replaceAll("\\", "/").includes("/node_modules/")
