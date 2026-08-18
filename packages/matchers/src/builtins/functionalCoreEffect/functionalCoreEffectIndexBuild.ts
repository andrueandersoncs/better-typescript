import type { Subscription } from "../../matcher/subscription.js"
import type { ProgramContext } from "@better-typescript/matchers/sources/data"
import { withProgramMatcherIndex } from "../../matcher/withProgramMatcherIndex.js"
import { roleMapFromProgram } from "../../support/roleMapFromProgram.js"
import type { FunctionalCoreEffectPolicy } from "./functionalCoreEffectPolicyClass.js"
import { FunctionalCoreEffectIndex } from "./functionalCoreEffectIndexClass.js"

export const buildFunctionalCoreEffectIndex =
  (policy: FunctionalCoreEffectPolicy) => (context: ProgramContext) => {
    const roles = roleMapFromProgram(policy.roleOf)(context)

    return new FunctionalCoreEffectIndex({
      policy,
      projectRoot: context.projectRoot,
      roles
    })
  }

export const withFunctionalCoreEffectIndex =
  <Fact>(subscriptions: (index: FunctionalCoreEffectIndex) => ReadonlyArray<Subscription<Fact>>) =>
  (policy: FunctionalCoreEffectPolicy) =>
    withProgramMatcherIndex(buildFunctionalCoreEffectIndex(policy))(subscriptions)
