import { Array, Effect } from "effect"
import * as ts from "typescript"
import { type Detection } from "@better-typescript/core/engine/location/detectionData"
import { Location } from "@better-typescript/core/engine/location/locationData"
import { Advice } from "@better-typescript/core/engine/derive/advice"
import { EvidenceItem } from "@better-typescript/core/engine/derive/evidenceItem"
import { deriveSignals } from "@better-typescript/core/engine/derive/deriveSignals"
import { ExampleSnippet } from "@better-typescript/core/engine/example/exampleSnippet"
import { InlineRefactorExamples } from "@better-typescript/core/engine/example/inlineRefactorExamples"
import { RefactorExample } from "@better-typescript/core/engine/example/refactorExample"
import { defineConfig } from "@better-typescript/core/project/loadWiringConfig"
import { makeWiring } from "@better-typescript/core/engine/wiring/makeWiring"
import { makeMergedWiring } from "@better-typescript/core/engine/wiring/makeMergedWiring"
import { makePolicy } from "@better-typescript/core/engine/policy/makePolicy"
import { makeFindings } from "@better-typescript/core/engine/policy/makeFindings"
import { filterFallbackAdviceForUncoveredFiles } from "@better-typescript/core/engine/fileLevelAdvice"
import { signalOf } from "@better-typescript/core/engine/signal/signal"
import { defaultWiring } from "@better-typescript/guidance/preset/defaultWiring"
import { functionalCoreEffectWiring } from "@better-typescript/guidance/functionalCoreEffect/advice"
import { nodeMatcher } from "@better-typescript/matchers/matcher/nodeMatcher"
import { makeNodeMatch } from "@better-typescript/matchers/matcher/makeNodeMatch"

// This example is documentation. Copy it to a consumer project's
// better-typescript.config.ts to load it. It stays under examples/ so this
// repository's self-host run does not load it.
const isConsoleLogCall = (node: ts.CallExpression): boolean => {
  const expression = node.expression

  return (
    ts.isPropertyAccessExpression(expression) &&
    ts.isIdentifier(expression.expression) &&
    expression.expression.text === "console" &&
    expression.name.text === "log"
  )
}

const noConsoleLogMatcher = nodeMatcher([ts.SyntaxKind.CallExpression])(ts.isCallExpression)(
  () => (node) => (isConsoleLogCall(node) ? [makeNodeMatch(node, null)] : [])
)

const countAtPath = (path: string, detections: ReadonlyArray<Detection>): number =>
  detections.filter((element) => element.location.path === path).length

const detectionPaths = (detections: ReadonlyArray<Detection>): ReadonlyArray<string> =>
  Array.fromIterable(new Set(detections.map((element) => element.location.path))).sort()

const consoleLogBoundaryAdvice = (detections: ReadonlyArray<Detection>): ReadonlyArray<Advice> =>
  deriveSignals((elements: ReadonlyArray<Detection>) =>
    detectionPaths(elements).map((path) =>
      Advice.make({
        location: Location.make({ path }),
        level: "file",
        title: "console logging in runtime code",
        remediation:
          "Replace console.log with the project's structured logger or return data to the caller.",
        evidence: [
          EvidenceItem.make({ measure: "console.log calls", count: countAtPath(path, elements) })
        ]
      })
    )
  )(detections)

const consoleLogExamples = [
  RefactorExample.make({
    bad: Array.make(
      ExampleSnippet.make({ filePath: "src/main.ts", code: `console.log("starting")` })
    ),
    good: Array.make(
      ExampleSnippet.make({
        filePath: "src/main.ts",
        code: `return { status: "starting" as const }`
      })
    )
  })
] as const

const consoleLogPolicy = makePolicy({
  name: "acme/no-console-log",
  matcher: noConsoleLogMatcher,
  guidance: () => (match) =>
    makeFindings(
      match.target,
      "Avoid console.log in runtime code.",
      "Return data to the caller or use this project's structured logger at the boundary.",
      null
    ),
  examples: InlineRefactorExamples.make({ examples: consoleLogExamples })
})

const localWiring = makeWiring({
  policies: [consoleLogPolicy],
  derive: (signals) => {
    const elementsOf = signalOf(signals)
    const specificAdvice = consoleLogBoundaryAdvice(elementsOf("acme/no-console-log"))

    const fallbackAdvice = deriveSignals((elements: ReadonlyArray<Detection>) =>
      detectionPaths(elements).map((path) =>
        Advice.make({
          location: Location.make({ path }),
          level: "file",
          title: "logging policy review",
          remediation: "Adopt the structured logger before this file grows more console output.",
          evidence: [
            EvidenceItem.make({ measure: "console.log calls", count: countAtPath(path, elements) })
          ]
        })
      )
    )(elementsOf("acme/no-console-log"))

    // filterFallbackAdviceForUncoveredFiles suppresses the generic nudge because covered files already get specifics.
    return Effect.succeed([
      ...specificAdvice,
      ...filterFallbackAdviceForUncoveredFiles(specificAdvice)(fallbackAdvice)
    ])
  }
})

// makeMergedWiring concatenates policies and derive stages, so extending the preset
// stays a single composition because the merge preserves both halves together.
const extendedWiring = makeMergedWiring([defaultWiring, functionalCoreEffectWiring, localWiring])

export default defineConfig([{ files: ["**/*"], wiring: extendedWiring }])
