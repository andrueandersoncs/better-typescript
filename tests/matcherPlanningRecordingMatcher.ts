import * as path from "node:path"
import { Array, MutableList, Order, Tuple, pipe } from "effect"
import { makeMatcherFromSubscriptions } from "@better-typescript/matchers/matcher/makeMatcherFromSubscriptions"

const relativeSourcePaths = (
  projectRoot: string,
  sourceFiles: ReadonlyArray<import("typescript").SourceFile>
) =>
  pipe(
    sourceFiles,
    Array.map((sourceFile) =>
      path.relative(projectRoot, sourceFile.fileName).replaceAll(path.sep, "/")
    ),
    Array.sort(Order.String)
  )

export const recordingMatcher = (
  name: string,
  plannedScopes: MutableList.MutableList<readonly [string, ReadonlyArray<string>]>
) =>
  makeMatcherFromSubscriptions((context) => {
    const sourcePaths = relativeSourcePaths(context.projectRoot, context.sourceFiles)

    MutableList.append(plannedScopes, Tuple.make(name, sourcePaths))

    return Array.empty()
  })
