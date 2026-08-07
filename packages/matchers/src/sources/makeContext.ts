import * as ts from "typescript"
import { ProgramContext } from "./data.js"

export const makeContext = (projectRoot: string) => (program: ts.Program) => {
  const checker = program.getTypeChecker()

  // Standalone loads treat the project as its own workspace because no wider root is known here.
  return ProgramContext.make({ program, checker, projectRoot, workspaceRoot: projectRoot })
}
