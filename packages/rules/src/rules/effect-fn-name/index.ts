import { effectQualityStructureKinds } from "../../internal/scanner/nodeKindSubscriptions.js"
import { Function, Option, pipe } from "effect"

import * as ts from "typescript"

import { fixedRuleMessage } from "../../internal/rule/fixedRuleMessage.js"

import { makeRule } from "../../internal/rule/makeRule.js"

import { acceptsNode } from "../../internal/scanner/acceptsNode.js"

import { makeNodeScanner } from "../../internal/scanner/makeNodeScanner.js"

import type { Match as ScannerMatch } from "../../internal/scanner/match.js"

import type { MatchContext } from "../../internal/scanner/matchContext.js"

import { makeSubjectMatch } from "../../internal/builtins/effectQuality/subjectMatch.js"

import {
  EffectFnNameInspection,
  inspectEffectFnCall
} from "../../internal/builtins/effectQuality/serviceRulesShared.js"

const domainQualifiedNamePattern = /^[^.\s]+\.[^.\s]+/

const effectFnNameIsUnqualified = (name: Option.Option<string>) =>
  pipe(
    name,
    Option.match({
      onNone: Function.constTrue,
      onSome: (value) => !domainQualifiedNamePattern.test(value)
    })
  )

const inspectionNameIsUnqualified = (inspection: EffectFnNameInspection) =>
  effectFnNameIsUnqualified(inspection.name)

const effectFnNameFindings =
  (context: MatchContext) =>
  (node: ts.Node): ReadonlyArray<ScannerMatch<string>> =>
    pipe(
      Option.liftPredicate(ts.isCallExpression)(node),
      Option.flatMap(inspectEffectFnCall(context.checker)),
      Option.filter(inspectionNameIsUnqualified),
      Option.map((inspection) => {
        const subject = pipe(inspection.name, Option.getOrElse(Function.constant("(anonymous)")))

        return makeSubjectMatch(subject)(inspection.node as ts.Node)
      }),
      Option.toArray
    )

const effectFnNameScanner = makeNodeScanner(effectQualityStructureKinds)(acceptsNode)(
  effectFnNameFindings
)

export const effectFnName = makeRule("effect-fn-name")(effectFnNameScanner)(
  fixedRuleMessage(
    "Use a non-empty domain-qualified Effect.fn name.",
    "Use a stable name such as UserRepo.get for tracing and spans."
  )
)
