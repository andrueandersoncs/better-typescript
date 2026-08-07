import * as path from "node:path"
import { Function } from "effect"
import * as ts from "typescript"
import { makeContext } from "@better-typescript/matchers/sources/makeContext"
import type { ProgramContext } from "@better-typescript/matchers/sources/data"
import { WorkspaceUpdate } from "@better-typescript/core/engine/watch/data"
import { syntheticRoot } from "./watchSyntheticRoot.js"

export const syntheticFilePath = path.join(syntheticRoot, "src", "cases.ts")

export const contextFromSource = (sourceText: string): ProgramContext => {
  const compilerOptions: ts.CompilerOptions = {
    module: ts.ModuleKind.ESNext,
    noLib: true,
    target: ts.ScriptTarget.ESNext
  }
  const sourceFile = ts.createSourceFile(
    syntheticFilePath,
    sourceText,
    ts.ScriptTarget.ESNext,
    true,
    ts.ScriptKind.TS
  )
  const host = ts.createCompilerHost(compilerOptions)

  host.fileExists = (candidatePath) => candidatePath === syntheticFilePath
  host.readFile = (candidatePath) => (candidatePath === syntheticFilePath ? sourceText : undefined)
  host.getSourceFile = (candidatePath) =>
    candidatePath === syntheticFilePath ? sourceFile : undefined
  host.getCurrentDirectory = Function.constant(syntheticRoot)

  const program = ts.createProgram({
    rootNames: [syntheticFilePath],
    options: compilerOptions,
    host
  })

  return makeContext(syntheticRoot)(program)
}

export const syntheticUpdate = (sourceText: string): WorkspaceUpdate =>
  new WorkspaceUpdate({
    rootPath: syntheticRoot,
    contexts: [contextFromSource(sourceText)]
  })
