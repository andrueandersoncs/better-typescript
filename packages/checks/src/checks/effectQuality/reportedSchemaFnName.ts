import { Function, Option, pipe } from "effect"
import * as ts from "typescript"
import type { CheckContext } from "@better-typescript/core/engine/check/data"
import type { EffectQualityIndex } from "./index.js"
import type { EffectQualityRuleFinding } from "./findings.js"
import { makeRuleFinding } from "./makeFindings.js"
import { inspectEffectFnCall, type EffectFnNameInspection } from "./reportedSchemaEffectFnShared.js"

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

export const effectFnNameFindings = (
  context: CheckContext,
  _index: EffectQualityIndex,
  node: ts.Node
): ReadonlyArray<EffectQualityRuleFinding> =>
  pipe(
    Option.liftPredicate(ts.isCallExpression)(node),
    Option.flatMap(inspectEffectFnCall(context.checker)),
    Option.filter(inspectionNameIsUnqualified),
    Option.map((inspection) => {
      const subject = pipe(inspection.name, Option.getOrElse(Function.constant("(anonymous)")))
      const evidence = inspection.node as ts.Node

      return makeRuleFinding("effect-fn-name")(subject)(evidence)
    }),
    Option.toArray
  )
