import { ruleNamed } from "./ruleNamed.js"
import { runRuleFixture } from "./runRuleFixture.js"

export const runRequireBecauseInCommentsFixture = () =>
  runRuleFixture(ruleNamed("require-because-in-comments"))
