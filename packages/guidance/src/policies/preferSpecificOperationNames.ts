import { makeFindings } from "@better-typescript/core/engine/policy"
import type { Guidance } from "@better-typescript/core/engine/policy/data"
import {
  preferSpecificOperationNamesMatcher,
  type PreferSpecificOperationNamesFact
} from "@better-typescript/matchers/builtins/preferSpecificOperationNames"
import { makeBuiltinPolicy } from "../definePolicy.js"

const preferSpecificOperationNamesGuidance: Guidance<PreferSpecificOperationNamesFact> =
  () => (match) => {
    const { nameText, vague, role, renamed } = match.fact

    return makeFindings(
      match.target,
      `${nameText} uses the vague operation ${vague}, but its body has a unique ${role} role.`,
      `Rename to ${renamed}, preserving the known object or result noun.`,
      match.fact
    )
  }

export const preferSpecificOperationNames = makeBuiltinPolicy(
  "prefer-specific-operation-names",
  preferSpecificOperationNamesMatcher,
  preferSpecificOperationNamesGuidance
)
