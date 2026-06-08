import type { LoadedProject } from "../project/loadProject.js"
import type { Rule, RuleMatch } from "../rules/index.js"

export const runRules = (
  loadedProject: LoadedProject,
  rules: ReadonlyArray<Rule>
): ReadonlyArray<RuleMatch> => {
  const checker = loadedProject.program.getTypeChecker()
  const matches: Array<RuleMatch> = []

  for (const sourceFile of loadedProject.program.getSourceFiles()) {
    if (shouldSkipSourceFile(sourceFile.fileName, sourceFile.isDeclarationFile)) {
      continue
    }

    for (const rule of rules) {
      matches.push(
        ...rule.check({
          program: loadedProject.program,
          checker,
          projectRoot: loadedProject.rootPath,
          sourceFile
        })
      )
    }
  }

  return matches
}

const shouldSkipSourceFile = (fileName: string, isDeclarationFile: boolean): boolean => {
  return isDeclarationFile || fileName.replaceAll("\\", "/").includes("/node_modules/")
}
