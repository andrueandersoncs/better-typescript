import { oneFinding } from "@better-typescript/core/engine/policy"
import type { Guidance } from "@better-typescript/core/engine/policy/data"
import {
  preferEffectPropertyAccessorsMatcher,
  type PreferEffectPropertyAccessorsFact
} from "@better-typescript/matchers/builtins/preferEffectPropertyAccessors"
import { defineBuiltinPolicy } from "../definePolicy.js"

const preferEffectPropertyAccessorsGuidance: Guidance<PreferEffectPropertyAccessorsFact> =
  () => (match) => {
    const { name, accessedText, moduleName, propertyKey } = match.fact
    const suggestion = `${moduleName}.get(${propertyKey})`

    return oneFinding(
      match.target,
      `Avoid defining ${name} only to read ${accessedText}.`,
      `Replace this property-access-only function with ${suggestion} from Effect. ` +
        "Use Struct.get for non-record data types, and Record.get or Record.has for records.",
      match.fact
    )
  }

export const preferEffectPropertyAccessors = defineBuiltinPolicy(
  "prefer-effect-property-accessors",
  preferEffectPropertyAccessorsMatcher,
  preferEffectPropertyAccessorsGuidance
)
