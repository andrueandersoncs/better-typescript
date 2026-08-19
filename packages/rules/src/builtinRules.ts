import { Array, Equivalence, Option, Order, Predicate, Struct, flow, pipe } from "effect"
import { RuleFinding } from "@better-typescript/core/linter"
import type { Rule, RuleContext } from "@better-typescript/core/linter"
import { defaultRules } from "./internal/default/defaultRules.js"
import {
  closedAbstractionScanner,
  duplicateShapeScanner,
  functionDerivedModelScanner,
  missingRationaleScanner,
  parameterBagScanner,
  passThroughConversionScanner,
  redundantAliasScanner,
  speculativeExportScanner,
  unusedFieldScanner
} from "./internal/builtins/concepts/conceptScanners.js"
import { conceptRuleMessage } from "./internal/default/conceptAndCompositionRules.js"
import { effectQualityRules } from "./effectQualityRules.js"
import { makeRule } from "./internal/rule/makeRule.js"

const closedAbstractionRule =
  makeRule("closed-abstraction")(closedAbstractionScanner)(conceptRuleMessage)

const duplicateShapeRule = makeRule("duplicate-shape")(duplicateShapeScanner)(conceptRuleMessage)

const functionDerivedModelRule = makeRule("function-derived-model")(functionDerivedModelScanner)(
  conceptRuleMessage
)

const missingRationaleRule =
  makeRule("missing-rationale")(missingRationaleScanner)(conceptRuleMessage)

const parameterBagRule = makeRule("parameter-bag")(parameterBagScanner)(conceptRuleMessage)

const passThroughConversionRule = makeRule("pass-through-conversion")(passThroughConversionScanner)(
  conceptRuleMessage
)

const redundantAliasRule = makeRule("redundant-alias")(redundantAliasScanner)(conceptRuleMessage)

const speculativeExportRule =
  makeRule("speculative-export")(speculativeExportScanner)(conceptRuleMessage)

const unusedFieldRule = makeRule("unused-field")(unusedFieldScanner)(conceptRuleMessage)

const conceptRules: ReadonlyArray<Rule> = Array.make(
  closedAbstractionRule,
  duplicateShapeRule,
  functionDerivedModelRule,
  missingRationaleRule,
  parameterBagRule,
  passThroughConversionRule,
  redundantAliasRule,
  speculativeExportRule,
  unusedFieldRule
)

const allDefaultRules = Array.appendAll(defaultRules, conceptRules)
const sameRuleName = Equivalence.strictEqual<string>()
const ruleName = Struct.get<Rule, "name">("name")
const hasProcessEnvironmentName = (name: string) => sameRuleName(name, "process-environment")
const isProcessEnvironment = flow(ruleName, hasProcessEnvironmentName)

const defaultProcessEnvironment = pipe(
  allDefaultRules,
  Array.findFirst(isProcessEnvironment),
  Option.getOrThrow
)

const effectQualityProcessEnvironment = pipe(
  effectQualityRules,
  Array.findFirst(isProcessEnvironment),
  Option.getOrThrow
)

const processEnvironmentMessage =
  "Read runtime configuration through Effect Config, not process.env. " +
  "Read the key in a Config-backed layer and provide deterministic config in tests."

const makeEnvironmentAccessFinding = (finding: RuleFinding): RuleFinding =>
  RuleFinding.make({ ...finding, message: processEnvironmentMessage })

const checkProcessEnvironment = (context: RuleContext) => {
  const defaultOccurrences = defaultProcessEnvironment.check(context)
  const effectQualityOccurrences = effectQualityProcessEnvironment.check(context)
  const occurrences = Array.appendAll(defaultOccurrences, effectQualityOccurrences)

  return Array.map(occurrences, makeEnvironmentAccessFinding)
}

const processEnvironment: Rule = {
  name: "process-environment",
  check: checkProcessEnvironment
}

const allRules = Array.appendAll(allDefaultRules, effectQualityRules)
const withoutProcessEnvironment = Array.filter(allRules, Predicate.not(isProcessEnvironment))
const ruleOrder = Order.mapInput<string, Rule>(Order.String, ruleName)

export const builtinRules: ReadonlyArray<Rule> = pipe(
  withoutProcessEnvironment,
  Array.append(processEnvironment),
  Array.sort(ruleOrder)
)
