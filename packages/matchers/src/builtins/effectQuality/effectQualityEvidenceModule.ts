import { Array, Function, Option, pipe } from "effect"
import * as ts from "typescript"
import { strictEqual } from "@better-typescript/matchers/equivalence"
import { nodeSubscriptions } from "../../matcher/nodeSubscriptions.js"
import { makeNodeMatch } from "../../matcher/makeNodeMatch.js"
import type { Match } from "../../matcher/match.js"
import type { MatchContext } from "../../matcher/matchContext.js"
import type { Subscription } from "../../matcher/subscription.js"
import { EffectQualityAdviceData } from "./effectQualityAdviceData.js"
import { EffectQualityAdviceFinding } from "./effectQualityAdviceFinding.js"
import { effectQualityBoundaryFeature } from "./effectQualityBoundaryFeature.js"
import { effectQualityRuntimeFeature } from "./effectQualityRuntimeFeature.js"
import { EffectQualityIndex } from "./effectQualityIndex.js"
import { makeEffectQualityMatcher } from "./buildEffectQualityIndex.js"
import { emptyAdviceFindings } from "./emptyAdviceFindings.js"
import { roleForSourceFile } from "./roleForSourceFile.js"

const effectQualityAdviceFindings = (
  context: MatchContext,
  index: EffectQualityIndex,
  node: ts.Node
): ReadonlyArray<EffectQualityAdviceFinding> => {
  const role = roleForSourceFile(index, context.sourceFile)

  const evidenceFeatures = Array.prepend(
    effectQualityRuntimeFeature.evidenceFindings,
    effectQualityBoundaryFeature.evidenceFindings
  )

  return Option.match(role, {
    onNone: Function.constant(emptyAdviceFindings),
    onSome: (sourceRole) =>
      pipe(
        evidenceFeatures,
        Array.map((feature) => feature(context, index, sourceRole, node)),
        Array.flatten
      )
  })
}

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

    return makeNodeMatch(finding.node, data)
  }

const evidenceElements =
  (index: EffectQualityIndex) =>
  (context: MatchContext) =>
  (node: ts.Node): ReadonlyArray<Match<EffectQualityAdviceData>> => {
    const findings = effectQualityAdviceFindings(context, index, node)
    const toDetection = detectionFromFinding(context)

    return Array.map(findings, toDetection)
  }

const evidenceSubscriptions = (
  index: EffectQualityIndex
): ReadonlyArray<Subscription<EffectQualityAdviceData>> => {
  const elements = evidenceElements(index)
  const subscribe = nodeSubscriptions(everySyntaxKind)(acceptsAnyNode)

  return subscribe(elements)
}

export const makeEffectQualityEvidenceMatcher = makeEffectQualityMatcher(evidenceSubscriptions)
