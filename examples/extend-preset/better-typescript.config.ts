import { Stream, pipe } from "effect"
import * as ts from "typescript"
import {
  AdviceElement,
  adviceLocation,
  deriveSignals,
  detection,
  evidenceItem,
  makeWiring,
  namedRuleCheck,
  nodeCheck,
  ruleSignal
} from "better-typescript"
import type { Detection, RuleCheck } from "better-typescript"
import { defaultWiring } from "better-typescript/preset"

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

const noConsoleLog: RuleCheck = nodeCheck([ts.SyntaxKind.CallExpression])(
  ts.isCallExpression
)((context) => {
  const element = detection(context)

  return (node): ReadonlyArray<Detection> =>
    isConsoleLogCall(node)
      ? [
          element({
            node,
            message: "Avoid console.log in runtime code.",
            hint:
              "Return data to the caller or use this project's structured logger at the boundary."
          })
        ]
      : []
})

const countAtPath = (
  path: string,
  detections: ReadonlyArray<Detection>
): number =>
  detections.filter((element) => element.location.path === path).length

const detectionPaths = (
  detections: ReadonlyArray<Detection>
): ReadonlyArray<string> =>
  Array.from(new Set(detections.map((element) => element.location.path))).sort()

const consoleLogBoundaryAdvice = (
  detections: Stream.Stream<Detection, Error>
): Stream.Stream<AdviceElement, Error> =>
  deriveSignals((elements: ReadonlyArray<Detection>) =>
    detectionPaths(elements).map(
      (path) =>
        new AdviceElement({
          location: adviceLocation(path),
          level: "file",
          title: "console logging in runtime code",
          remediation:
            "Replace console.log with the project's structured logger or return data to the caller.",
          evidence: [
            evidenceItem("console.log calls", countAtPath(path, elements))
          ]
        })
    )
  )(detections)

const consoleLogRule = namedRuleCheck("acme/no-console-log", noConsoleLog)

export default makeWiring({
  rules: [...defaultWiring.rules, consoleLogRule],
  helpers: defaultWiring.helpers,
  advice: (ruleSignals, helperSignals) => {
    const elementsOf = ruleSignal(ruleSignals)
    const presetAdvice = defaultWiring.advice(ruleSignals, helperSignals)
    const localAdvice = consoleLogBoundaryAdvice(
      elementsOf("acme/no-console-log")
    )

    return pipe(presetAdvice, Stream.concat(localAdvice))
  }
})
