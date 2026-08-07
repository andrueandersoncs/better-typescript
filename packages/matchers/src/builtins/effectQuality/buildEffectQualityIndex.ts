import type { ProgramContext } from "@better-typescript/matchers/sources/data"
import type { Subscription } from "../../matcher/subscription.js"
import { withProgramMatcherIndex } from "../../matcher/withProgramMatcherIndex.js"
import { roleMapFromProgram } from "../../support/roleMapFromProgram.js"
import { EffectQualityIndex } from "./effectQualityIndex.js"
import { EffectQualityPolicy } from "./effectQualityPolicy.js"

export const buildEffectQualityIndex =
  (policy: EffectQualityPolicy) => (context: ProgramContext) => {
    const roles = roleMapFromProgram(policy.roleOf)(context)

    return new EffectQualityIndex({
      policy,
      projectRoot: context.projectRoot,
      roles
    })
  }

export const makeEffectQualityMatcher =
  (subscriptions: (index: EffectQualityIndex) => ReadonlyArray<Subscription>) =>
  (policy: EffectQualityPolicy) =>
    withProgramMatcherIndex(buildEffectQualityIndex(policy))(subscriptions)
