import * as path from "node:path"
import {
  Array,
  Equivalence,
  Function,
  HashSet,
  Match,
  Option,
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
import { normalizeViolations } from "./normalizeViolations.js"
import { RuleName } from "./ruleName.js"

const isTsTypeChecker = (input: unknown): input is ts.TypeChecker =>
  Predicate.hasProperty(input, "getTypeAtLocation")

const isTsSourceFile = (input: unknown): input is ts.SourceFile =>
  Predicate.hasProperty(input, "getLineAndCharacterOfPosition")

const isTsNode = (input: unknown): input is ts.Node => Predicate.hasProperty(input, "getSourceFile")

const TsTypeChecker = Schema.declare(isTsTypeChecker)
const TsSourceFile = Schema.declare(isTsSourceFile)
const TsNode = Schema.declare(isTsNode)

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

// NodeTarget keeps syntax ownership with a Rule because core owns final source location.
export const NodeTarget = Schema.TaggedStruct("NodeTarget", { node: TsNode })

export interface NodeTarget extends Schema.Schema.Type<typeof NodeTarget> {}

const positionIsWithinSource = (target: PositionTarget) => {
  const isInteger = Number.isInteger(target.position)
  const isAtOrAfterStart = target.position >= target.sourceFile.pos
  const isAtOrBeforeEnd = target.position <= target.sourceFile.end
  const checks = Array.make(isInteger, isAtOrAfterStart, isAtOrBeforeEnd)

  return Array.every(checks, Boolean) ? true : "Position must be an integer within the source file"
}

const positionTargetFilter = Schema.makeFilter(positionIsWithinSource)

// PositionTarget validates its offset because core must materialize every finding safely.
export const PositionTarget = Schema.TaggedStruct("PositionTarget", {
  sourceFile: TsSourceFile,
  position: Schema.Number
}).check(positionTargetFilter)

export interface PositionTarget extends Schema.Schema.Type<typeof PositionTarget> {}

const FindingTarget = Schema.Union([NodeTarget, PositionTarget])

const sourceFileForTarget = (target: typeof FindingTarget.Type) =>
  pipe(
    Match.value(target),
    Match.tag("NodeTarget", ({ node }) => node.getSourceFile()),
    Match.tag("PositionTarget", Struct.get<PositionTarget, "sourceFile">("sourceFile")),
    Match.exhaustive
  )

// RuleFinding excludes report metadata because core owns final Violation materialization.
export const RuleFinding = Schema.Struct({
  message: Schema.String,
  target: FindingTarget
})

export interface RuleFinding extends Schema.Schema.Type<typeof RuleFinding> {}

type RuleCheck = (context: RuleContext) => ReadonlyArray<RuleFinding>

const isRuleCheck = (input: unknown): input is RuleCheck => {
  const callable = Predicate.isFunction(input)

  return callable
}

const RuleCheck = Schema.declare(isRuleCheck)

// Rule defines the extension point because built-ins and callers provide checks through one interface.
export const Rule = Schema.Struct({
  name: RuleName,
  check: RuleCheck
})

export interface Rule extends Schema.Schema.Type<typeof Rule> {}

const normalizedRelativePath = (workspaceRoot: string) => (fileName: string) =>
  path.relative(workspaceRoot, fileName).replaceAll("\\", "/")

const materializeFinding =
  (workspaceRoot: string) =>
  (ruleName: RuleName) =>
  (level: EnabledRuleLevel) =>
  ({ message, target }: RuleFinding): Violation => {
    const materializeTarget =
      (fileName: string) =>
      (line: number) =>
      (column: number): Violation => {
        const filePath = normalizedRelativePath(workspaceRoot)(fileName)

        return Violation.make({ ruleName, level, message, filePath, line, column })
      }

    return pipe(
      Match.value(target),
      Match.tag("NodeTarget", ({ node }) => {
        const sourceFile = node.getSourceFile()
        const start = node.getStart(sourceFile)
        const position = sourceFile.getLineAndCharacterOfPosition(start)

        return materializeTarget(sourceFile.fileName)(position.line + 1)(position.character + 1)
      }),
      Match.tag("PositionTarget", ({ sourceFile, position }) => {
        const location = sourceFile.getLineAndCharacterOfPosition(position)

        return materializeTarget(sourceFile.fileName)(location.line + 1)(location.character + 1)
      }),
      Match.exhaustive
    )
  }

const isProjectSourceFile = (sourceFile: ts.SourceFile) => {
  const normalizedPath = sourceFile.fileName.replaceAll("\\", "/")
  const isProjectFile = !sourceFile.isDeclarationFile
  const isDependencyFile = normalizedPath.includes("/node_modules/")
  const isOutsideDependencies = !isDependencyFile

  return isProjectFile && isOutsideDependencies
}

const sameSourceFile = Equivalence.strictEqual<ts.SourceFile>()

const findingTargetsSource =
  (sourceFile: ts.SourceFile) =>
  ({ target }: RuleFinding) => {
    const targetSourceFile = sourceFileForTarget(target)

    return sameSourceFile(targetSourceFile, sourceFile)
  }

const violationsForRule =
  (context: RuleContext) =>
  ([rule, level]: readonly [Rule, EnabledRuleLevel]) => {
    const findings = pipe(
      rule.check(context),
      Array.filter(findingTargetsSource(context.sourceFile))
    )

    const materializeRuleFinding = materializeFinding(context.workspaceRoot)(rule.name)(level)

    return Array.map(findings, materializeRuleFinding)
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
  (fileMatcher: Option.Option<Bun.Glob>) =>
  (compiledConfig: Option.Option<ReadonlyArray<CompiledConfigEntry>>) =>
  (rules: ReadonlyArray<Rule>) =>
  ({ program, rootPath }: LoadedWorkspace["projects"][number]) => {
    const sourceFileForRootName = (fileName: string) => program.getSourceFile(fileName)

    const matchesRequestedFiles = (sourceFile: ts.SourceFile) =>
      pipe(
        fileMatcher,
        Option.match({
          onNone: Function.constTrue,
          onSome: (matcher) =>
            pipe(sourceFile.fileName, normalizedRelativePath(workspaceRoot), (filePath) =>
              matcher.match(filePath)
            )
        })
      )

    const sourceFiles = pipe(
      program.getRootFileNames(),
      Array.map(sourceFileForRootName),
      Array.filter(Predicate.isNotNullish),
      Array.filter(isProjectSourceFile),
      Array.filter(matchesRequestedFiles)
    )

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

const lintWithGlob =
  (fileGlob: Option.Option<string>) =>
  (inputConfig: Option.Option<LintConfig>) =>
  (request: LintRequest): ReadonlyArray<Violation> => {
    const rules = validateRules(request.rules)
    const validatedConfig = Option.map(inputConfig, validateConfigRuleNames(rules))
    const compiledConfig = Option.map(validatedConfig, Array.map(buildConfigEntry))
    const fileMatcher = Option.map(fileGlob, makeGlob)

    const runProjectRules = pipe(
      request.project.rootPath,
      violationsForProject,
      Function.apply(fileMatcher),
      Function.apply(compiledConfig),
      Function.apply(rules)
    )

    return pipe(request.project.projects, Array.flatMap(runProjectRules), normalizeViolations)
  }

const noLintConfig = Option.none<LintConfig>()
const noFileGlob = Option.none<string>()
const lintAllFiles = lintWithGlob(noFileGlob)

export const lint = lintAllFiles(noLintConfig)

export const lintConfigured = flow(Option.some<LintConfig>, lintAllFiles)

export const lintConfiguredForGlob = (fileGlob: Option.Option<string>) =>
  flow(Option.some<LintConfig>, lintWithGlob(fileGlob))
