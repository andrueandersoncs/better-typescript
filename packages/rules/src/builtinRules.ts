import { Array, Order, Struct } from "effect"
import type { Rule } from "@better-typescript/core/linter"
import { effectQualityRules } from "./effectQualityRules.js"
import { defaultRules } from "./internal/default/defaultRules.js"

const allRules = Array.appendAll(defaultRules, effectQualityRules)
const ruleName = Struct.get<Rule, "name">("name")
const ruleOrder = Order.mapInput<string, Rule>(Order.String, ruleName)

export const builtinRules: ReadonlyArray<Rule> = Array.sort(allRules, ruleOrder)
