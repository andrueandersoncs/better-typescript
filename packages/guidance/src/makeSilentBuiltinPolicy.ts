import type { Matcher } from "@better-typescript/matchers/matcher/matcherData"
import { makeSilentPolicy } from "@better-typescript/core/engine/policy/makeSilentPolicy"
import { type Guidance } from "@better-typescript/core/engine/policy/guidance"
import { type Policy } from "@better-typescript/core/engine/policy/policyClass"
import { type RefactorExampleSource } from "@better-typescript/core/engine/example/refactorExampleSource"
import { makePackageExamples } from "./makePackageExamples.js"

export const makeSilentBuiltinPolicy = <Fact>(
  name: string,
  matcher: Matcher,
  guidance: Guidance<Fact>
): Policy => {
  const examples = makePackageExamples(name)

  return makeSilentPolicy<
    Fact,
    {
      readonly name: string
      readonly matcher: Matcher
      readonly guidance: Guidance<Fact>
      readonly examples: RefactorExampleSource
    }
  >({
    name,
    matcher,
    guidance,
    examples
  })
}
