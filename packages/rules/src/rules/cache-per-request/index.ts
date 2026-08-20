import { effectQualityRuntimeKinds } from "../../internal/scanner/nodeKindSubscriptions.js"
import { Match as EffectMatch, Function, Option, pipe } from "effect"

import * as ts from "typescript"

import { strictEqual } from "../../internal/equivalence.js"

import { fixedRuleMessage } from "../../internal/rule/fixedRuleMessage.js"

import { makeRule } from "../../internal/rule/makeRule.js"

import { acceptsNode } from "../../internal/scanner/acceptsNode.js"

import { makeNodeScanner } from "../../internal/scanner/makeNodeScanner.js"

import type { Match as ScannerMatch } from "../../internal/scanner/match.js"

import type { MatchContext } from "../../internal/scanner/matchContext.js"

import { callExpressionOf } from "../../internal/support/callExpressionOf.js"

import { enclosingFunctionLike } from "../../internal/support/effectApi/enclosingFunctionLike.js"

import { effectApiCall } from "../../internal/builtins/effectQuality/effectApiFacts.js"

import { makeSubjectMatch } from "../../internal/builtins/effectQuality/subjectMatch.js"

import {
  nestedInsideCacheLookup,
  cacheMakeNames
} from "../../internal/builtins/effectQuality/cacheRulesShared.js"

const isModuleScopeFunction = (fn: ts.FunctionLikeDeclaration) =>
  pipe(
    EffectMatch.value(fn.parent),
    EffectMatch.when(ts.isSourceFile, Function.constTrue),
    EffectMatch.when(ts.isModuleBlock, Function.constTrue),
    EffectMatch.when(ts.isVariableDeclaration, (declaration) => {
      const statement = declaration.parent?.parent
      const isVariableStatement = ts.isVariableStatement(statement)
      const isSourceFileParent = ts.isSourceFile(statement.parent)

      return isVariableStatement && isSourceFileParent
    }),
    EffectMatch.orElse(Function.constFalse)
  )

const cacheMakeIsPerRequest = (checker: ts.TypeChecker) => (call: ts.CallExpression) =>
  pipe(
    enclosingFunctionLike(call),
    Option.exists((fn) => {
      const hasParameters = fn.parameters.length > 0
      const moduleScope = isModuleScopeFunction(fn)
      const nested = strictEqual(false)(moduleScope)
      const insideLookup = nestedInsideCacheLookup(checker)(call)
      const notLookup = strictEqual(false)(insideLookup)
      const hasParametersOrNested = hasParameters || nested

      return hasParametersOrNested && notLookup
    })
  )

const cachePerRequestFindings =
  (context: MatchContext) =>
  (node: ts.Node): ReadonlyArray<ScannerMatch<string>> => {
    const matchesCacheMake = effectApiCall(context.checker)("Cache")(cacheMakeNames)

    return pipe(
      callExpressionOf(node),
      Option.filter(matchesCacheMake),
      Option.filter(cacheMakeIsPerRequest(context.checker)),
      Option.map(makeSubjectMatch("Cache.make")),
      Option.toArray
    )
  }

const cachePerRequestScanner =
  makeNodeScanner(effectQualityRuntimeKinds)(acceptsNode)(cachePerRequestFindings)

export const cachePerRequest = makeRule("cache-per-request")(cachePerRequestScanner)(
  fixedRuleMessage(
    "Construct Cache once in its owning layer or scope, not per request.",
    "Create the cache during layer acquisition and close over the shared handle."
  )
)
