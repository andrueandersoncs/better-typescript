import { Array } from "effect"
import * as ts from "typescript"
import { makeDetection, nodeSubscriptions } from "@better-typescript/core/engine/check"
import type { CheckContext, Subscription } from "@better-typescript/core/engine/check/data"
import type { Detection } from "@better-typescript/core/engine/location/data"
import { withEffectQualityIndex, type EffectQualityIndex } from "./index.js"
import { EffectQualityAdviceData } from "./data.js"
import { effectQualityAdviceFindings } from "./evidence.js"
import type { EffectQualityAdviceFinding } from "./findings.js"
import { strictEqual } from "@better-typescript/core/engine/equivalence"

const isSyntaxKindNumber = (candidate: string | number): candidate is ts.SyntaxKind =>
  strictEqual(typeof candidate, "number")

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
  (context: CheckContext) =>
  (finding: EffectQualityAdviceFinding): Detection => {
    const data = EffectQualityAdviceData.make({
      kind: finding.kind,
      subject: finding.subject
    })

    return makeDetection(context)({
      node: finding.node,
      message: finding.kind,
      hint: finding.subject,
      data
    })
  }

const evidenceElements =
  (index: EffectQualityIndex) =>
  (context: CheckContext) =>
  (node: ts.Node): ReadonlyArray<Detection> => {
    const findings = effectQualityAdviceFindings(context, index, node)
    const toDetection = detectionFromFinding(context)

    return Array.map(findings, toDetection)
  }

const evidenceSubscriptions = (index: EffectQualityIndex): ReadonlyArray<Subscription> => {
  const elements = evidenceElements(index)
  const subscribe = nodeSubscriptions(everySyntaxKind)(acceptsAnyNode)

  return subscribe(elements)
}

export const makeEffectQualityEvidence = withEffectQualityIndex(evidenceSubscriptions)
