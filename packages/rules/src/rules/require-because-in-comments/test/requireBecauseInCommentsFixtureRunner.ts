import { ruleNamed } from "../../../../test/ruleNamed.js"
import { runRuleFixture } from "../../../../test/runRuleFixture.js"

export const runRequireBecauseInCommentsFixture = () =>
  runRuleFixture(ruleNamed("require-because-in-comments"))
