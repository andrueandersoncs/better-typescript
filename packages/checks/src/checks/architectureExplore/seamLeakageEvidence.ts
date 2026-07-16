import * as path from "node:path"
import { Array, Option, pipe } from "effect"
import * as ts from "typescript"
import type { CheckContext } from "@better-typescript/core/engine/check/data"
import type { Check } from "@better-typescript/core/engine/check/data"
import type { Detection } from "@better-typescript/core/engine/location/data"

import { SeamLeakageData } from "./data.js"
import { importElements, isTestSourceFile } from "./programSymbols.js"
import { nodeCheck, detection } from "@better-typescript/core/engine/check"

const message =
  "Seam leakage evidence — this import reaches through an internal or package-source path."

const hint =
  "Route callers and tests through the Module's declared public interface so implementation layout can change locally."

const leakageKind =
  (context: CheckContext) =>
  (specifier: string): Option.Option<"internal-path" | "source-path"> => {
    const normalized = specifier.replaceAll("\\", "/")
    const rawSegments = normalized.split("/")

    const segments = pipe(
      rawSegments,
      Array.filter((segment) => segment.length > 0),
      Array.filter((segment) => segment !== "."),
      Array.filter((segment) => segment !== "..")
    )

    if (Array.contains(segments, "internal")) {
      return Option.some("internal-path")
    }

    const isRelative = normalized.startsWith(".")
    const sourceDirectory = path.dirname(context.sourceFile.fileName)
    const resolved = path.resolve(sourceDirectory, normalized)
    const relativeToProject = path.relative(context.projectRoot, resolved)
    const isParentDirectory = relativeToProject === ".."
    const isParentPath = relativeToProject.startsWith(`..${path.sep}`)
    const outsideConditions = Array.make(isParentDirectory, isParentPath)
    const outsideProject = Array.some(outsideConditions, Boolean)
    const isPackageSpecifier = !isRelative
    const packageConditions = Array.make(isPackageSpecifier, outsideProject)
    const isPackagePath = Array.some(packageConditions, Boolean)
    const reachesSource = Array.contains(segments, "src")
    const sourceLeakConditions = Array.make(isPackagePath, reachesSource)
    const isSourceLeak = Array.every(sourceLeakConditions, Boolean)

    return isSourceLeak ? Option.some("source-path") : Option.none()
  }

const seamLeakageElement = (context: CheckContext) => {
  const element = detection(context)
  const testClassifier = isTestSourceFile(context.workspaceRoot)
  const fromTest = testClassifier(context.sourceFile)

  const elementForImport =
    (node: ts.ImportDeclaration) =>
    (importedPath: string): Option.Option<Detection> => {
      const normalizedPath = importedPath.replaceAll("\\", "/")
      const rawPathParts = normalizedPath.split("/")
      const pathParts = Array.filter(rawPathParts, (part) => part.length > 0)

      return pipe(
        leakageKind(context)(importedPath),
        Option.map((kind) => {
          const data = new SeamLeakageData({
            importedPath,
            depth: pathParts.length,
            kind,
            fromTest
          })

          return element({ node, message, hint, data })
        })
      )
    }

  return elementForImport
}

const seamLeakageElements = importElements(seamLeakageElement)

const importDeclarationKinds = Array.of(ts.SyntaxKind.ImportDeclaration)

export const seamLeakageEvidence: Check = nodeCheck(importDeclarationKinds)(ts.isImportDeclaration)(
  seamLeakageElements
)
