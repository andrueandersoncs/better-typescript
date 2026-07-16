import { Stream, pipe } from "effect"
import * as ts from "typescript"
import type { Check } from "@better-typescript/core/engine/check/data"
import type { Detection } from "@better-typescript/core/engine/location/data"
import { Advice } from "@better-typescript/core/engine/derive/data"
import { adviceLocation, deriveSignals, evidenceItem } from "@better-typescript/core/engine/derive"
import { exampleSnippet, refactorExample } from "@better-typescript/core/engine/example"
import {
  defineConfig,
  makeWiring,
  namedCheck,
  signalOf
} from "@better-typescript/core/engine/report"
import { defaultWiring } from "@better-typescript/checks/preset/defaultWiring"
import { nodeCheck } from "@better-typescript/core/engine/check"
import { detection } from "@better-typescript/core/engine/check"

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
    const element = detection(context)

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
  Array.from(new Set(detections.map((element) => element.location.path))).sort()

const consoleLogBoundaryAdvice = (detections: Stream.Stream<Detection>): Stream.Stream<Advice> =>
  deriveSignals((elements: ReadonlyArray<Detection>) =>
    detectionPaths(elements).map(
      (path) =>
        new Advice({
          location: adviceLocation(path),
          level: "file",
          title: "console logging in runtime code",
          remediation:
            "Replace console.log with the project's structured logger or return data to the caller.",
          evidence: [evidenceItem("console.log calls", countAtPath(path, elements))]
        })
    )
  )(detections)

const consoleLogExamples = [
  refactorExample(
    exampleSnippet("src/main.ts", `console.log("starting")`),
    exampleSnippet("src/main.ts", `return { status: "starting" as const }`)
  )
] as const

const consoleLogCheck = namedCheck("acme/no-console-log", noConsoleLog, consoleLogExamples)

const extendedWiring = makeWiring({
  checks: [...defaultWiring.checks, consoleLogCheck],
  derive: (signals) => {
    const elementsOf = signalOf(signals)
    const presetAdvice = defaultWiring.derive(signals)
    const localAdvice = consoleLogBoundaryAdvice(elementsOf("acme/no-console-log"))

    return pipe(presetAdvice, Stream.concat(localAdvice))
  }
})

export default defineConfig([{ files: ["**/*"], wiring: extendedWiring }])
