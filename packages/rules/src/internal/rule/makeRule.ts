import * as path from "node:path"
import {
  Array,
  Data,
  Equivalence,
  Match as EffectMatch,
  MutableRef,
  Option,
  Struct,
  flow,
  pipe
} from "effect"
import type { Rule, RuleContext } from "@better-typescript/core/linter"
import type { RuleName } from "@better-typescript/core/ruleName"
import { Violation } from "@better-typescript/core/linter"
import type { Scanner } from "../scanner/scannerData.js"
import type { Match } from "../scanner/match.js"
import { ProgramContext } from "../sources/data.js"
import { runScanner } from "../scanner/runScanner.js"
import type { RuleMessage } from "./ruleMessage.js"

const normalizedRelativePath = (root: string) => (fileName: string) =>
  path.relative(root, fileName).replaceAll("\\", "/")

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
    const emptyCache = Option.none<readonly [object, ReadonlyArray<Match<Fact>>]>()
    const cache = MutableRef.make(emptyCache)
    const sameProgram = Equivalence.strictEqual<object>()
    const sameFilePath = Equivalence.strictEqual<string>()

    const candidates = (context: RuleContext) => {
      const cached = pipe(
        MutableRef.get(cache),
        Option.filter(([program]) => sameProgram(program, context.program)),
        Option.map(([, matches]) => matches)
      )

      if (Option.isSome(cached)) {
        return cached.value
      }

      const contextForProgram = programContext(context)
      const matches = runScanner(scanner)(contextForProgram)

      const populatedCache = Option.some<readonly [object, ReadonlyArray<Match<Fact>>]>([
        context.program,
        matches
      ])

      MutableRef.set(cache, populatedCache)

      return matches
    }

    const check = (context: RuleContext) => {
      const currentFilePath = normalizedRelativePath(context.workspaceRoot)(
        context.sourceFile.fileName
      )

      const contextForProgram = programContext(context)
      const describe = message(contextForProgram)

      const makeCandidateViolation = (candidate: Match<Fact>) => {
        const copy = describe(candidate)
        const hint = copy.hint.trim()
        const hasHint = hint.length > 0
        const actionableMessage = hasHint ? `${copy.message} ${hint}` : copy.message

        return pipe(
          EffectMatch.value(candidate.target),
          EffectMatch.tag("NodeTarget", ({ node }) => {
            const sourceFile = node.getSourceFile()
            const start = node.getStart(sourceFile)
            const position = sourceFile.getLineAndCharacterOfPosition(start)
            const filePath = normalizedRelativePath(context.workspaceRoot)(sourceFile.fileName)

            return Violation.make({
              ruleName: name,
              level: "error",
              message: actionableMessage,
              filePath,
              line: position.line + 1,
              column: position.character + 1
            })
          }),
          EffectMatch.tag("PositionTarget", ({ sourceFile, line, column }) => {
            const filePath = normalizedRelativePath(context.workspaceRoot)(sourceFile.fileName)

            return Violation.make({
              ruleName: name,
              level: "error",
              message: actionableMessage,
              filePath,
              line,
              column
            })
          }),
          EffectMatch.exhaustive
        )
      }

      const violationFilePath = Struct.get<Violation, "filePath">("filePath")
      const matchesCurrentFilePath = (filePath: string) => sameFilePath(filePath, currentFilePath)
      const isCurrentFile = flow(violationFilePath, matchesCurrentFilePath)

      return pipe(
        candidates(context),
        Array.map(makeCandidateViolation),
        Array.filter(isCurrentFile)
      )
    }

    return new Data.Class<Rule>({ name, check })
  }
