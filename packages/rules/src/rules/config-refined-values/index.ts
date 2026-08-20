import { callExpressionKinds } from "../../internal/scanner/nodeKindSubscriptions.js"
import { Array, Function, Option, pipe } from "effect"
import * as ts from "typescript"
import { fixedRuleMessage } from "../../internal/rule/fixedRuleMessage.js"
import { makeRule } from "../../internal/rule/makeRule.js"
import { makeNodeScanner } from "../../internal/scanner/makeNodeScanner.js"
import type { Match as ScannerMatch } from "../../internal/scanner/match.js"
import type { MatchContext } from "../../internal/scanner/matchContext.js"
import { hasEffectCallAncestor } from "../../internal/support/effectApi/hasEffectCallAncestor.js"
import { callIsEffectApi } from "../../internal/builtins/effectQuality/callIsEffectApi.js"
import { stringLiteralArgument } from "./stringLiteralArgument.js"
import {
  makeSubjectMatch,
  noSubjectMatches
} from "../../internal/builtins/effectQuality/subjectMatch.js"

const configStringNames = Array.of("string")

const findingWhen =
  (shouldEmit: boolean) =>
  (finding: ScannerMatch<string>): ReadonlyArray<ScannerMatch<string>> =>
    shouldEmit ? Array.of(finding) : noSubjectMatches

const configRefinedNames = Array.make("schema", "mapOrFail", "url", "port", "int", "boolean")

const refinedConfigKeyPattern =
  /(?:path|dir|directory|folder|url|uri|host|hostname|endpoint|base[_-]?url|port|id|uuid|identifier|slug|email)$/i

const configRefinedValuesCandidates =
  (context: MatchContext) =>
  (node: ts.CallExpression): ReadonlyArray<ScannerMatch<string>> => {
    const isConfigString = callIsEffectApi(context.checker)("Config")(configStringNames)(node)

    if (!isConfigString) {
      return noSubjectMatches
    }

    // Only keys whose names imply refined domains apply because broad strings need no refinement.
    const key = pipe(stringLiteralArgument(0)(node), Option.getOrElse(Function.constant("")))
    const hasKey = key.length > 0
    const matchesRefinedKey = refinedConfigKeyPattern.test(key)
    const refinedParts = Array.make(hasKey, matchesRefinedKey)
    const refinedShape = Array.every(refinedParts, Boolean)

    const alreadyRefinedParent = hasEffectCallAncestor(context.checker)("Config")(
      configRefinedNames
    )(node)

    const subject = hasKey ? `Config.string(${JSON.stringify(key)})` : "Config.string"
    const notAlreadyRefined = !alreadyRefinedParent
    const shouldEmitParts = Array.make(refinedShape, notAlreadyRefined)
    const shouldEmit = Array.every(shouldEmitParts, Boolean)
    const finding = makeSubjectMatch(subject)(node.expression)

    return findingWhen(shouldEmit)(finding)
  }

const configRefinedValuesScanner = makeNodeScanner(callExpressionKinds)(ts.isCallExpression)(
  configRefinedValuesCandidates
)

export const configRefinedValues = makeRule("config-refined-values")(configRefinedValuesScanner)(
  fixedRuleMessage(
    "Refine configuration values.",
    "Use Config.schema or Config.mapOrFail for path, URL, port, and identifier values."
  )
)
