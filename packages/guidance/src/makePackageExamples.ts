import * as path from "node:path"
import { fileURLToPath } from "node:url"
import { DirectoryRefactorExamples } from "@better-typescript/core/engine/example/directoryRefactorExamples"
import { type RefactorExampleSource } from "@better-typescript/core/engine/example/refactorExampleSource"

const moduleUrlPath = fileURLToPath(import.meta.url)
const moduleDirectory = path.dirname(moduleUrlPath)
const packageExamplesRoot = path.resolve(moduleDirectory, "..", "examples")

// Package examples remain inert descriptors because report rendering owns their effectful loading.
const packageExampleDirectory = (name: string) => path.join(packageExamplesRoot, name)

export const makePackageExamples = (name: string): RefactorExampleSource => {
  const root = packageExampleDirectory(name)

  return DirectoryRefactorExamples.make({ root })
}
