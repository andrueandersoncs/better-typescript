import { Array, Data, Equivalence, Match as EffectMatch, pipe } from "effect"
import { RuleFinding } from "@better-typescript/core/linter"
import type { Rule, RuleContext } from "@better-typescript/core/linter"
import type { RuleName } from "@better-typescript/core/ruleName"
import type { Scanner } from "../scanner/scannerData.js"
import type { Match } from "../scanner/match.js"
import { ProgramContext } from "../sources/data.js"
import { runScanner } from "../scanner/runScanner.js"
import type { RuleMessage } from "./ruleMessage.js"

const programContext = (context: RuleContext) =>
  ProgramContext.make({
    program: context.program,
    checker: context.checker,
    projectRoot: context.projectRoot,
    workspaceRoot: context.workspaceRoot
  })

export const makeRule =
  (name: RuleName) =>
  <Fact>(scanner: Scanner<Fact>) =>
  (message: RuleMessage<Fact>): Rule => {
    const sameSourceFile = Equivalence.strictEqual<RuleContext["sourceFile"]>()

    const check = (context: RuleContext) => {
      const contextForProgram = programContext(context)
      const describe = message(contextForProgram)

      const sourceFileForTarget = (target: Match<Fact>["target"]) =>
        pipe(
          EffectMatch.value(target),
          EffectMatch.tag("NodeTarget", ({ node }) => node.getSourceFile()),
          EffectMatch.tag("PositionTarget", ({ sourceFile }) => sourceFile),
          EffectMatch.exhaustive
        )

      const isCurrentFile = (candidate: Match<Fact>) => {
        const sourceFile = sourceFileForTarget(candidate.target)

        return sameSourceFile(sourceFile, context.sourceFile)
      }

      const makeFinding = (candidate: Match<Fact>): RuleFinding => {
        const copy = describe(candidate)
        const hint = copy.hint.trim()
        const hasHint = hint.length > 0
        const actionableMessage = hasHint ? `${copy.message} ${hint}` : copy.message

        return RuleFinding.make({ message: actionableMessage, target: candidate.target })
      }

      return pipe(runScanner(scanner)(context), Array.filter(isCurrentFile), Array.map(makeFinding))
    }

    return new Data.Class<Rule>({ name, check })
  }
