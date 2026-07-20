import { Array } from "effect"
import * as ts from "typescript"
import type { Check } from "@better-typescript/core/engine/check/data"
import type { Detection } from "@better-typescript/core/engine/location/data"
import { Advice } from "@better-typescript/core/engine/derive/data"
import {
  makeAdviceLocation,
  deriveSignals,
  makeEvidenceItem
} from "@better-typescript/core/engine/derive"
import {
  ExampleSnippet,
  InlineRefactorExamples,
  RefactorExample
} from "@better-typescript/core/engine/example/data"
import {
  defineConfig,
  makeWiring,
  makeMergedWiring,
  makeNamedCheck
} from "@better-typescript/core/engine/wiring"
import { filterFallbackAdviceForUncoveredFiles } from "@better-typescript/core/engine/report"
import { signalOf } from "@better-typescript/core/engine/signal"
import { defaultWiring } from "@better-typescript/checks/preset/defaultWiring"
import { functionalCoreEffectWiring } from "@better-typescript/checks/functionalCoreEffect/wiring"
import { nodeCheck } from "@better-typescript/core/engine/check"
import { makeDetection } from "@better-typescript/core/engine/check"

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

const noConsoleLog: Check = nodeCheck([ts.SyntaxKind.CallExpression])(ts.isCallExpression)(
  (context) => {
    const element = makeDetection(context)

    return (node): ReadonlyArray<Detection> =>
      isConsoleLogCall(node)
        ? [
            element({
              node,
              message: "Avoid console.log in runtime code.",
              hint: "Return data to the caller or use this project's structured logger at the boundary."
            })
          ]
        : []
  }
)

const countAtPath = (path: string, detections: ReadonlyArray<Detection>): number =>
  detections.filter((element) => element.location.path === path).length

const detectionPaths = (detections: ReadonlyArray<Detection>): ReadonlyArray<string> =>
  globalThis.Array.from(new Set(detections.map((element) => element.location.path))).sort()

const consoleLogBoundaryAdvice = (detections: ReadonlyArray<Detection>): ReadonlyArray<Advice> =>
  deriveSignals((elements: ReadonlyArray<Detection>) =>
    detectionPaths(elements).map((path) =>
      Advice.make({
        location: makeAdviceLocation(path),
        level: "file",
        title: "console logging in runtime code",
        remediation:
          "Replace console.log with the project's structured logger or return data to the caller.",
        evidence: [makeEvidenceItem("console.log calls", countAtPath(path, elements))]
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

const consoleLogCheck = makeNamedCheck(
  "acme/no-console-log",
  noConsoleLog,
  InlineRefactorExamples.make({ examples: consoleLogExamples })
)

const localWiring = makeWiring({
  checks: [consoleLogCheck],
  derive: (signals) => {
    const elementsOf = signalOf(signals)
    const specificAdvice = consoleLogBoundaryAdvice(elementsOf("acme/no-console-log"))

    const fallbackAdvice = deriveSignals((elements: ReadonlyArray<Detection>) =>
      detectionPaths(elements).map((path) =>
        Advice.make({
          location: makeAdviceLocation(path),
          level: "file",
          title: "logging policy review",
          remediation: "Adopt the structured logger before this file grows more console output.",
          evidence: [makeEvidenceItem("console.log calls", countAtPath(path, elements))]
        })
      )
    )(elementsOf("acme/no-console-log"))

    // filterFallbackAdviceForUncoveredFiles suppresses the generic nudge because covered files already get specifics.
    return [
      ...specificAdvice,
      ...filterFallbackAdviceForUncoveredFiles(specificAdvice)(fallbackAdvice)
    ]
  }
})

// makeMergedWiring concatenates checks and derive stages, so extending the preset
// stays a single composition because the merge preserves both halves together.
const extendedWiring = makeMergedWiring([defaultWiring, functionalCoreEffectWiring, localWiring])

export default defineConfig([{ files: ["**/*"], wiring: extendedWiring }])
