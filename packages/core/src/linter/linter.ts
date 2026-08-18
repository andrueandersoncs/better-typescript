import * as path from "node:path"
import { Array, Equivalence, Function, Order, Predicate, Schema, Struct, pipe } from "effect"
import type * as ts from "typescript"
import type { LoadedWorkspace } from "../project/loadProject/loadProject.js"
import { TsProgram } from "../project/loadProject/tsProgram.js"
import type { LintRequest } from "./lintRequest.js"
import type { ViolationCandidate } from "./violationCandidate.js"

const isTsTypeChecker = (input: unknown): input is ts.TypeChecker =>
  Predicate.hasProperty(input, "getTypeAtLocation")

const isTsSourceFile = (input: unknown): input is ts.SourceFile =>
  Predicate.hasProperty(input, "getLineAndCharacterOfPosition")

const TsTypeChecker = Schema.declare(isTsTypeChecker)
const TsSourceFile = Schema.declare(isTsSourceFile)

// RuleContext groups compiler services because every rule needs the same analysis boundary.
export const RuleContext = Schema.Struct({
  program: TsProgram,
  checker: TsTypeChecker,
  projectRoot: Schema.String,
  workspaceRoot: Schema.String,
  sourceFile: TsSourceFile
})

export interface RuleContext extends Schema.Schema.Type<typeof RuleContext> {}

// Violation is the serialized finding contract because the CLI and programmatic API share it.
export const Violation = Schema.Struct({
  ruleName: Schema.String,
  message: Schema.String,
  filePath: Schema.String,
  line: Schema.Number,
  column: Schema.Number
})

export interface Violation extends Schema.Schema.Type<typeof Violation> {}

// Rule defines the extension point because built-ins and callers provide checks through one API.
export interface Rule {
  readonly name: string
  readonly check: (context: RuleContext) => ReadonlyArray<Violation>
}

export const makeViolation = ({
  ruleName,
  message,
  workspaceRoot,
  sourceFile,
  node
}: ViolationCandidate): Violation => {
  const nodeStart = node.getStart(sourceFile)
  const position = sourceFile.getLineAndCharacterOfPosition(nodeStart)
  const relativePath = path.relative(workspaceRoot, sourceFile.fileName)
  const filePath = relativePath.replaceAll("\\", "/")

  return Violation.make({
    ruleName,
    message,
    filePath,
    line: position.line + 1,
    column: position.character + 1
  })
}

const isProjectSourceFile = (sourceFile: ts.SourceFile) => {
  const normalizedPath = sourceFile.fileName.replaceAll("\\", "/")
  const isProjectFile = !sourceFile.isDeclarationFile
  const isDependencyFile = normalizedPath.includes("/node_modules/")
  const isOutsideDependencies = !isDependencyFile

  return isProjectFile && isOutsideDependencies
}

const violationOrders = Array.make(
  Order.mapInput<string, Violation>(Order.String, Struct.get("filePath")),
  Order.mapInput<number, Violation>(Order.Number, Struct.get("line")),
  Order.mapInput<number, Violation>(Order.Number, Struct.get("column")),
  Order.mapInput<string, Violation>(Order.String, Struct.get("ruleName")),
  Order.mapInput<string, Violation>(Order.String, Struct.get("message"))
)

const violationOrder = Order.combineAll<Violation>(violationOrders)

const sameViolation = Equivalence.Struct({
  ruleName: Equivalence.strictEqual<string>(),
  message: Equivalence.strictEqual<string>(),
  filePath: Equivalence.strictEqual<string>(),
  line: Equivalence.strictEqual<number>(),
  column: Equivalence.strictEqual<number>()
})

const withRuleName = (ruleName: string) => (violation: Violation) =>
  Violation.make({ ...violation, ruleName })

const violationsForRule = (context: RuleContext) => (rule: Rule) => {
  const violations = rule.check(context)
  const assignRuleName = withRuleName(rule.name)

  return Array.map(violations, assignRuleName)
}

const violationsForSource =
  (workspaceRoot: string) =>
  (projectRoot: string) =>
  (program: ts.Program) =>
  (rules: ReadonlyArray<Rule>) =>
  (sourceFile: ts.SourceFile) => {
    const checker = program.getTypeChecker()

    const context = RuleContext.make({
      program,
      checker,
      projectRoot,
      workspaceRoot,
      sourceFile
    })

    const runRule = violationsForRule(context)

    return Array.flatMap(rules, runRule)
  }

const violationsForProject =
  (workspaceRoot: string) =>
  (rules: ReadonlyArray<Rule>) =>
  ({ program, rootPath }: LoadedWorkspace["projects"][number]) => {
    const programSourceFiles = program.getSourceFiles()
    const sourceFiles = Array.filter(programSourceFiles, isProjectSourceFile)

    const runSource = pipe(
      workspaceRoot,
      violationsForSource,
      Function.apply(rootPath),
      Function.apply(program),
      Function.apply(rules)
    )

    return Array.flatMap(sourceFiles, runSource)
  }

export const lint = ({ project, rules }: LintRequest): ReadonlyArray<Violation> => {
  const runProjectRules = pipe(project.rootPath, violationsForProject, Function.apply(rules))

  return pipe(
    project.projects,
    Array.flatMap(runProjectRules),
    Array.sort(violationOrder),
    Array.dedupeWith(sameViolation)
  )
}
