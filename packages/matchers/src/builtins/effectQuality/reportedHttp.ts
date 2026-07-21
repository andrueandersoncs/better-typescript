import { Array } from "effect"
import type * as ts from "typescript"
import type { MatchContext } from "@better-typescript/matchers/matcher/data"
import type { EffectQualityIndex } from "./index.js"
import type { EffectQualityRuleFinding } from "./findings.js"
import { rawFetchAbortFindings } from "./reportedHttpFetch.js"
import { httpResponseValidationFindings } from "./reportedHttpResponseValidation.js"
import { httpStatusDecodeOrderFindings } from "./reportedHttpStatusOrder.js"
import { effectTestStyleFindings } from "./reportedHttpTestStyle.js"

export const httpRuleFindings = (
  context: MatchContext,
  index: EffectQualityIndex,
  node: ts.Node
): ReadonlyArray<EffectQualityRuleFinding> => {
  const rawFetch = rawFetchAbortFindings(context)(node)
  const responseValidation = httpResponseValidationFindings(context)(index)(node)
  const statusDecodeOrder = httpStatusDecodeOrderFindings(context)(index)(node)
  const testStyle = effectTestStyleFindings(context)(index)(node)
  const findings = Array.make(rawFetch, responseValidation, statusDecodeOrder, testStyle)

  return Array.flatten(findings)
}
