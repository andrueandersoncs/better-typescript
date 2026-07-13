import { Array, Function, Option, Struct, pipe } from "effect"
import * as ts from "typescript"
import { nodeCheck } from "@better-typescript/core/engine/check"
import { detection } from "@better-typescript/core/engine/location"
import type { CheckContext } from "@better-typescript/core/engine/check/data"
import type { Check } from "@better-typescript/core/engine/check/data"
import type { Detection } from "@better-typescript/core/engine/location/data"
import type { NonEmptyRefactorExamples } from "@better-typescript/core/engine/example/data"
import { fixtureRefactorExamples } from "../../fixtureExamples.js"
import { SeamLeakageData } from "./data.js"

const message =
  "This import is Seam Leakage Evidence — it reaches past a public entry into another Module's internals."

const hint =
  "Import through the neighbouring Module's public interface, or deepen a shared Module at the seam."

const isDeepInternalPath = (specifier: string): boolean => {
  const normalized = specifier.replaceAll("\\", "/")

  return normalized.includes("/internal/")
}

const importElements = (context: CheckContext) => {
  const element = detection(context)

  const handler = (node: ts.ImportDeclaration): ReadonlyArray<Detection> => {
    const specifier = pipe(
      Option.fromNullable(node.moduleSpecifier),
      Option.filter(ts.isStringLiteral),
      Option.map(Struct.get("text"))
    )

    const importedPath = pipe(
      specifier,
      Option.getOrElse(Function.constant(""))
    )

    const pathParts = importedPath.split("/")
    const depth = Array.filter(pathParts, (part) => part.length > 0).length
    const leaks = Option.exists(specifier, isDeepInternalPath)

    const data = new SeamLeakageData({ importedPath, depth })

    const reported = element({
      node,
      message,
      hint,
      data
    })

    return leaks ? Array.of(reported) : Array.empty()
  }

  return handler
}

const importDeclarationKinds = Array.of(ts.SyntaxKind.ImportDeclaration)

export const seamLeakageEvidence: Check = nodeCheck(importDeclarationKinds)(
  ts.isImportDeclaration
)(importElements)

export const seamLeakageEvidenceExamples: NonEmptyRefactorExamples =
  fixtureRefactorExamples("seam-leakage-evidence")
