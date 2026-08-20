import { layerAcquisitionNames } from "../../internal/builtins/effectQuality/layerAcquisitionNames.js"
import { effectQualityRuntimeKinds } from "../../internal/scanner/nodeKindSubscriptions.js"
import { Array, Option, pipe } from "effect"

import * as ts from "typescript"

import { strictEqual } from "../../internal/equivalence.js"

import { fixedRuleMessage } from "../../internal/rule/fixedRuleMessage.js"

import { makeRule } from "../../internal/rule/makeRule.js"

import { acceptsNode } from "../../internal/scanner/acceptsNode.js"

import { makeNodeScanner } from "../../internal/scanner/makeNodeScanner.js"

import type { Match as ScannerMatch } from "../../internal/scanner/match.js"

import type { MatchContext } from "../../internal/scanner/matchContext.js"

import { callExpressionOf } from "../../internal/support/callExpressionOf.js"

import { effectApiCall } from "../../internal/builtins/effectQuality/effectApiFacts.js"

import {
  makeSubjectMatch,
  noSubjectMatches
} from "../../internal/builtins/effectQuality/subjectMatch.js"

import { nestedInsideCacheLookup } from "../../internal/builtins/effectQuality/cacheRulesShared.js"

const provideNames = Array.make(
  "provide",
  "provideService",
  "provideServiceEffect",
  "provideContext"
)

const layerBuildNames = Array.of("build")

const scopedClientCacheFindings =
  (context: MatchContext) =>
  (node: ts.Node): ReadonlyArray<ScannerMatch<string>> => {
    const matchesCall = effectApiCall(context.checker)
    const call = callExpressionOf(node)
    const isProvide = pipe(call, Option.exists(matchesCall("Effect")(provideNames)))
    const isLayerBuild = pipe(call, Option.exists(matchesCall("Layer")(layerBuildNames)))

    const isLayerAcquisition = pipe(
      call,
      Option.exists(matchesCall("Layer")(layerAcquisitionNames))
    )

    const provideOrBuild = isProvide || isLayerBuild
    const matches = provideOrBuild || isLayerAcquisition
    const nestedInLookup = nestedInsideCacheLookup(context.checker)(node)
    const matchedNestedFlags = Array.make(matches, nestedInLookup)
    const matchedNested = Array.every(matchedNestedFlags, Boolean)
    const shouldSkip = strictEqual(false)(matchedNested)

    if (shouldSkip) {
      return noSubjectMatches
    }

    const subject = node.getText(context.sourceFile)
    const finding = makeSubjectMatch(subject)(node)

    return Array.of(finding)
  }

const scopedClientCacheScanner =
  makeNodeScanner(effectQualityRuntimeKinds)(acceptsNode)(scopedClientCacheFindings)

export const scopedClientCache = makeRule("scoped-client-cache")(scopedClientCacheScanner)(
  fixedRuleMessage(
    "Acquire clients outside Cache lookup functions and share them through a layer.",
    "Build the client once in the owning layer, then make lookup a plain call."
  )
)
