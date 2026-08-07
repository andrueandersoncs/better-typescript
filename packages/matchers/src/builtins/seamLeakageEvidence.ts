import * as path from "node:path"
import { Array, Option, Schema, Struct, pipe } from "effect"
import { strictEqual } from "@better-typescript/matchers/equivalence"
import * as ts from "typescript"
import { isTestSourceFile } from "./architectureExplore/isTestPath.js"
import { nodeMatcher } from "../matcher/nodeMatcher.js"
import { makeNodeMatch } from "../matcher/makeNodeMatch.js"
import type { MatchContext } from "../matcher/matchContext.js"

const leakageKinds = Array.make<["internal-path", "source-path"]>("internal-path", "source-path")
const leakageKindSchema = Schema.Literals(leakageKinds)

// SeamLeakageData is one leakage class because remediation differs by kind.
export const SeamLeakageData = Schema.Struct({
  importedPath: Schema.String,
  depth: Schema.Number,
  kind: leakageKindSchema,
  fromTest: Schema.Boolean
})

export interface SeamLeakageData extends Schema.Schema.Type<typeof SeamLeakageData> {}

export const importElements =
  <Context, Element>(
    elementFor: (
      context: Context
    ) => (node: ts.ImportDeclaration) => (specifier: string) => Option.Option<Element>
  ) =>
  (context: Context) => {
    const elementForImport = elementFor(context)

    const elementsForImport = (node: ts.ImportDeclaration): ReadonlyArray<Element> => {
      const elementForSpecifier = elementForImport(node)

      return pipe(
        Option.fromNullishOr(node.moduleSpecifier),
        Option.filter(ts.isStringLiteral),
        Option.map(Struct.get("text")),
        Option.flatMap(elementForSpecifier),
        Option.toArray
      )
    }

    return elementsForImport
  }

const leakageKind =
  (context: MatchContext) =>
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
    const isParentDirectory = strictEqual("..")(relativeToProject)
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

const seamLeakageElement = (context: MatchContext) => {
  const testClassifier = isTestSourceFile(context.workspaceRoot)
  const fromTest = testClassifier(context.sourceFile)

  const elementForImport = (node: ts.ImportDeclaration) => (importedPath: string) => {
    const normalizedPath = importedPath.replaceAll("\\", "/")
    const rawPathParts = normalizedPath.split("/")
    const pathParts = Array.filter(rawPathParts, (part) => part.length > 0)

    return pipe(
      leakageKind(context)(importedPath),
      Option.map((kind) => {
        const data = SeamLeakageData.make({
          importedPath,
          depth: pathParts.length,
          kind,
          fromTest
        })

        return makeNodeMatch(node, data)
      })
    )
  }

  return elementForImport
}

const seamLeakageElements = importElements(seamLeakageElement)

const importDeclarationKinds = Array.of(ts.SyntaxKind.ImportDeclaration)

export const seamLeakageEvidence = nodeMatcher(importDeclarationKinds)(ts.isImportDeclaration)(
  seamLeakageElements
)
