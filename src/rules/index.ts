import { preferEffectSchemaGuard } from "./preferEffectSchemaGuard.js"
import type { Rule } from "./types.js"

export const rules: ReadonlyArray<Rule> = [preferEffectSchemaGuard]

export type { Rule, RuleContext, RuleMatch } from "./types.js"
