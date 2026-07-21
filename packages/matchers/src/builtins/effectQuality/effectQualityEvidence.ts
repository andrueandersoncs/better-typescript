import { Array } from "effect"
import * as ts from "typescript"
import { nodeSubscriptions } from "@better-typescript/matchers/matcher"
import {
  nodeMatch,
  type Match,
  type MatchContext,
  type Subscription
} from "@better-typescript/matchers/matcher/data"
import { withEffectQualityIndex, type EffectQualityIndex } from "./index.js"
import { EffectQualityAdviceData } from "./data.js"
import { effectQualityAdviceFindings } from "./evidence.js"
import type { EffectQualityAdviceFinding } from "./findings.js"
import { strictEqual } from "@better-typescript/matchers/equivalence"

const isSyntaxKindNumber = (candidate: string | number): candidate is ts.SyntaxKind =>
  strictEqual("number")(typeof candidate)

const isInSyntaxKindRange = (candidate: ts.SyntaxKind) => {
  const isNonNegative = candidate >= 0
  const isBeforeCount = candidate < ts.SyntaxKind.Count
  const bounds = Array.make(isNonNegative, isBeforeCount)

  return Array.every(bounds, Boolean)
}

const syntaxKindValues = Object.values(ts.SyntaxKind)
const numericSyntaxKinds = Array.filter(syntaxKindValues, isSyntaxKindNumber)
const boundedSyntaxKinds = Array.filter(numericSyntaxKinds, isInSyntaxKindRange)
const everySyntaxKind = Array.dedupe(boundedSyntaxKinds)

const acceptsAnyNode = (_node: ts.Node): _node is ts.Node => true

const detectionFromFinding =
  (_context: MatchContext) =>
  (finding: EffectQualityAdviceFinding): Match<EffectQualityAdviceData> => {
    const data = EffectQualityAdviceData.make({
      kind: finding.kind,
      subject: finding.subject
    })

    return nodeMatch(finding.node, data)
  }

const evidenceElements =
  (index: EffectQualityIndex) =>
  (context: MatchContext) =>
  (node: ts.Node): ReadonlyArray<Match<EffectQualityAdviceData>> => {
    const findings = effectQualityAdviceFindings(context, index, node)
    const toDetection = detectionFromFinding(context)

    return Array.map(findings, toDetection)
  }

const evidenceSubscriptions = (index: EffectQualityIndex): ReadonlyArray<Subscription> => {
  const elements = evidenceElements(index)
  const subscribe = nodeSubscriptions(everySyntaxKind)(acceptsAnyNode)

  return subscribe(elements)
}

export const makeEffectQualityEvidenceMatcher = withEffectQualityIndex(evidenceSubscriptions)
