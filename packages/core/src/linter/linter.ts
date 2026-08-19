import * as path from "node:path"
import {
  Array,
  Equivalence,
  Function,
  HashSet,
  Option,
  Order,
  Predicate,
  Record,
  Schema,
  Struct,
  Tuple,
  flow,
  pipe
} from "effect"
import type * as ts from "typescript"
import { EnabledRuleLevel, LintConfig, RuleLevel, RuleSettings } from "../config/config.js"
import type { LoadedWorkspace } from "../project/loadProject/loadProject.js"
import { TsProgram } from "../project/loadProject/tsProgram.js"
import type { LintRequest } from "./lintRequest.js"
import type { ViolationCandidate } from "./violationCandidate.js"
import { RuleName } from "./ruleName.js"

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
  ruleName: RuleName,
  level: EnabledRuleLevel,
  message: Schema.String,
  filePath: Schema.String,
  line: Schema.Number,
  column: Schema.Number
})

export interface Violation extends Schema.Schema.Type<typeof Violation> {}

// Rule defines the extension point because built-ins and callers provide checks through one API.
export interface Rule {
  readonly name: RuleName
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
    level: "error",
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
  Order.mapInput<string, Violation>(Order.String, Struct.get("level")),
  Order.mapInput<string, Violation>(Order.String, Struct.get("message"))
)

const violationOrder = Order.combineAll<Violation>(violationOrders)

const sameViolation = Equivalence.Struct({
  ruleName: Equivalence.strictEqual<string>(),
  level: Equivalence.strictEqual<EnabledRuleLevel>(),
  message: Equivalence.strictEqual<string>(),
  filePath: Equivalence.strictEqual<string>(),
  line: Equivalence.strictEqual<number>(),
  column: Equivalence.strictEqual<number>()
})

const withRuleMetadata =
  (ruleName: RuleName) => (level: EnabledRuleLevel) => (violation: Violation) =>
    Violation.make({ ...violation, ruleName, level })

const violationsForRule =
  (context: RuleContext) =>
  ([rule, level]: readonly [Rule, EnabledRuleLevel]) => {
    const violations = rule.check(context)
    const assignRuleMetadata = withRuleMetadata(rule.name)(level)

    return Array.map(violations, assignRuleMetadata)
  }

const isBunGlob = (input: unknown): input is Bun.Glob => Predicate.hasProperty(input, "match")
const BunGlob = Schema.declare(isBunGlob)
const GlobMatchers = Schema.Array(BunGlob)

// CompiledConfigEntry keeps reusable glob matchers because matching runs once for every source file.
const CompiledConfigEntry = Schema.Struct({
  matchers: GlobMatchers,
  rules: RuleSettings
})

// CompiledConfigEntry exposes matcher and settings together because selection consumes both.
interface CompiledConfigEntry extends Schema.Schema.Type<typeof CompiledConfigEntry> {}

const makeGlob = (file: string) => new Bun.Glob(file)

const buildConfigEntry = ({ files, rules }: LintConfig[number]): CompiledConfigEntry => {
  const matchers = Array.map(files, makeGlob)

  return CompiledConfigEntry.make({ matchers, rules })
}

const matchesFile = (filePath: string) => (entry: CompiledConfigEntry) =>
  Array.some(entry.matchers, (matcher) => matcher.match(filePath))

const sameString = Equivalence.strictEqual<string>()
const sameNumber = Equivalence.strictEqual<number>()
const isEnabledRuleLevel = Schema.is(EnabledRuleLevel)
const defaultRuleLevel: EnabledRuleLevel = "error"
const isWildcard = (name: string) => sameString(name, "*")
const isRegisteredRuleName = Predicate.not(isWildcard)

const configuredRuleNames = (config: LintConfig) =>
  pipe(
    config,
    Array.flatMap(({ rules }) => Record.keys(rules)),
    Array.filter(isRegisteredRuleName)
  )

const validateConfigRuleNames = (rules: ReadonlyArray<Rule>) => (config: LintConfig) => {
  const ruleNames = Array.map(rules, Struct.get("name"))
  const knownNames = HashSet.fromIterable(ruleNames)

  const configNamesAreKnown = (candidate: LintConfig) => {
    const candidateNames = configuredRuleNames(candidate)

    const nameIsKnown = (name: string) => {
      const containsName = HashSet.has(name)

      return containsName(knownNames)
    }

    return Array.every(candidateNames, nameIsKnown) ? true : "Config contains unknown rule names"
  }

  const knownNamesFilter = Schema.makeFilter(configNamesAreKnown)
  const ConfigForRules = LintConfig.check(knownNamesFilter)
  Schema.asserts(ConfigForRules, config)

  return config
}

const RuleNameArray = Schema.Array(RuleName)

const ruleNamesAreUnique = (names: ReadonlyArray<RuleName>) => {
  const distinctNames = HashSet.fromIterable(names)
  const distinctCount = HashSet.size(distinctNames)
  const hasNoDuplicates = sameNumber(distinctCount, names.length)

  return hasNoDuplicates ? true : "Rule names must be unique"
}

const uniqueRuleNamesFilter = Schema.makeFilter(ruleNamesAreUnique)
const RuleNames = RuleNameArray.check(uniqueRuleNamesFilter)

const validateRules = (rules: ReadonlyArray<Rule>) => {
  const ruleNames = Array.map(rules, Struct.get("name"))

  Schema.asserts(RuleNames, ruleNames)

  return rules
}

const makeRuleSetting =
  (level: RuleLevel) =>
  (name: RuleName): readonly [RuleName, RuleLevel] => [name, level]

const settingsForEveryRule = (ruleNames: ReadonlyArray<RuleName>) => (level: RuleLevel) =>
  pipe(ruleNames, Array.map(makeRuleSetting(level)), Record.fromEntries)

const settingsForEntry =
  (ruleNames: ReadonlyArray<RuleName>) =>
  (entry: CompiledConfigEntry) =>
  (settings: Readonly<Record<string, RuleLevel>>) => {
    const wildcard = Record.get(entry.rules, "*")

    const baseline = Option.match(wildcard, {
      onNone: Function.constant(settings),
      onSome: settingsForEveryRule(ruleNames)
    })

    const explicitSettings = Record.remove(entry.rules, "*")

    return Record.union(baseline, explicitSettings, (_earlier, later) => later)
  }

const emptyRuleSettings: Readonly<Record<string, RuleLevel>> = {}

const configuredRulesForSource =
  (compiledConfig: ReadonlyArray<CompiledConfigEntry>) =>
  (rules: ReadonlyArray<Rule>) =>
  (filePath: string) => {
    const ruleNames = Array.map(rules, Struct.get("name"))
    const matchingEntries = Array.filter(compiledConfig, matchesFile(filePath))
    const applySettings = settingsForEntry(ruleNames)

    const settings = Array.reduce(matchingEntries, emptyRuleSettings, (current, entry) =>
      applySettings(entry)(current)
    )

    const configuredRule = (rule: Rule) => {
      const makeConfiguredRule = (level: EnabledRuleLevel) => Tuple.make(rule, level)
      const configuredRuleAtLevel = flow(makeConfiguredRule, Array.of)
      const level = pipe(Record.get(settings, rule.name), Option.filter(isEnabledRuleLevel))

      return Option.match(level, {
        onNone: Array.empty<readonly [Rule, EnabledRuleLevel]>,
        onSome: configuredRuleAtLevel
      })
    }

    return Array.flatMap(rules, configuredRule)
  }

const rulesForSource =
  (workspaceRoot: string) =>
  (compiledConfig: Option.Option<ReadonlyArray<CompiledConfigEntry>>) =>
  (rules: ReadonlyArray<Rule>) =>
  (sourceFile: ts.SourceFile) => {
    const relativePath = path.relative(workspaceRoot, sourceFile.fileName)
    const filePath = relativePath.replaceAll("\\", "/")
    const withDefaultLevel = (rule: Rule) => Tuple.make(rule, defaultRuleLevel)
    const defaultRules = Array.map(rules, withDefaultLevel)

    return Option.match(compiledConfig, {
      onNone: Function.constant(defaultRules),
      onSome: (config) => configuredRulesForSource(config)(rules)(filePath)
    })
  }

const violationsForSource =
  (workspaceRoot: string) =>
  (projectRoot: string) =>
  (program: ts.Program) =>
  (compiledConfig: Option.Option<ReadonlyArray<CompiledConfigEntry>>) =>
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

    const sourceRules = rulesForSource(workspaceRoot)(compiledConfig)(rules)(sourceFile)
    const runRule = violationsForRule(context)

    return Array.flatMap(sourceRules, runRule)
  }

const violationsForProject =
  (workspaceRoot: string) =>
  (compiledConfig: Option.Option<ReadonlyArray<CompiledConfigEntry>>) =>
  (rules: ReadonlyArray<Rule>) =>
  ({ program, rootPath }: LoadedWorkspace["projects"][number]) => {
    const programSourceFiles = program.getSourceFiles()
    const sourceFiles = Array.filter(programSourceFiles, isProjectSourceFile)

    const runSource = pipe(
      workspaceRoot,
      violationsForSource,
      Function.apply(rootPath),
      Function.apply(program),
      Function.apply(compiledConfig),
      Function.apply(rules)
    )

    return Array.flatMap(sourceFiles, runSource)
  }

const lintWithConfig =
  (inputConfig: Option.Option<LintConfig>) =>
  (request: LintRequest): ReadonlyArray<Violation> => {
    const rules = validateRules(request.rules)
    const validatedConfig = Option.map(inputConfig, validateConfigRuleNames(rules))
    const compiledConfig = Option.map(validatedConfig, Array.map(buildConfigEntry))

    const runProjectRules = pipe(
      request.project.rootPath,
      violationsForProject,
      Function.apply(compiledConfig),
      Function.apply(rules)
    )

    return pipe(
      request.project.projects,
      Array.flatMap(runProjectRules),
      Array.sort(violationOrder),
      Array.dedupeWith(sameViolation)
    )
  }

const noLintConfig = Option.none<LintConfig>()

export const lint = lintWithConfig(noLintConfig)

export const lintConfigured = flow(Option.some<LintConfig>, lintWithConfig)
