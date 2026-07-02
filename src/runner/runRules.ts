import type * as ts from "typescript"
import type { LoadedProject } from "../project/loadProject.js"
import { ProgramContext, RuleContext } from "../rules/index.js"
import type { Rule, RuleMatch } from "../rules/index.js"
import { compileRules } from "./compileRules.js"

const isCheckableSourceFile = (sourceFile: ts.SourceFile): boolean =>
  !shouldSkipSourceFile(sourceFile.isDeclarationFile)(sourceFile.fileName)

const contextForSourceFile =
  (programContext: ProgramContext) =>
  (sourceFile: ts.SourceFile): RuleContext =>
    new RuleContext({
      program: programContext.program,
      checker: programContext.checker,
      projectRoot: programContext.projectRoot,
      sourceFile
    })

export const runRules =
  (rules: ReadonlyArray<Rule>) =>
  (loadedProject: LoadedProject): ReadonlyArray<RuleMatch> => {
    const checker = loadedProject.program.getTypeChecker()
    const programContext = new ProgramContext({
      program: loadedProject.program,
      checker,
      projectRoot: loadedProject.rootPath
    })
    const checkSourceFile = compileRules(rules)(programContext)

    return loadedProject.program
      .getSourceFiles()
      .filter(isCheckableSourceFile)
      .map(contextForSourceFile(programContext))
      .flatMap(checkSourceFile)
  }

export const shouldSkipSourceFile =
  (isDeclarationFile: boolean) =>
  (fileName: string): boolean =>
    isDeclarationFile || fileName.replaceAll("\\", "/").includes("/node_modules/")
