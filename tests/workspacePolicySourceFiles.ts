import { Array } from "effect"
import * as ts from "typescript"
import { WorkspaceSourceFile } from "@better-typescript/matchers/matcher/workspaceSourceFile"

export const sourceFile = (fileName: string) =>
  ts.createSourceFile(fileName, "export const value = 1", ts.ScriptTarget.ES2022)

export const sourceFiles = Array.make(
  new WorkspaceSourceFile({ path: "src/one.ts", sourceFile: sourceFile("one.ts") }),
  new WorkspaceSourceFile({ path: "src/two.ts", sourceFile: sourceFile("two.ts") }),
  new WorkspaceSourceFile({ path: "test/one.test.ts", sourceFile: sourceFile("one.test.ts") })
)
