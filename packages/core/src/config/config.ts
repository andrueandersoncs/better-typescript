import { Array, Equivalence, Record, Schema } from "effect"
import { RuleName } from "../linter/ruleName.js"

const sameString = Equivalence.strictEqual<string>()
const isRuleName = Schema.is(RuleName)
// EnabledRuleLevel exists because reported violations can be errors or warnings, never disabled.
export const EnabledRuleLevel = Schema.Literals(["error", "warn"])

export type EnabledRuleLevel = typeof EnabledRuleLevel.Type

// RuleLevel exists because each scope needs enabled severities plus explicit disablement.
export const RuleLevel = Schema.Literals(["error", "warn", "off"])

export type RuleLevel = typeof RuleLevel.Type

const RuleSettingsRecord = Schema.Record(Schema.String, RuleLevel)
const ConfigFileArray = Schema.Array(Schema.String)

const isRuleSettingName = (name: string) => {
  const isWildcard = sameString(name, "*")
  const isRegisteredName = isRuleName(name)
  const validKinds = Array.make(isWildcard, isRegisteredName)

  return Array.some(validKinds, Boolean)
}

const ruleSettingsAreValid = (settings: Readonly<Record<string, RuleLevel>>) => {
  const names = Record.keys(settings)
  const hasSettings = names.length > 0
  const validNames = Array.every(names, isRuleSettingName)
  const requirements = Array.make(hasSettings, validNames)

  return Array.every(requirements, Boolean)
}

const ruleSettingsValidation = (settings: Readonly<Record<string, RuleLevel>>) =>
  ruleSettingsAreValid(settings)
    ? true
    : "Rule settings must be non-empty and use kebab-case rule names or *"

const ruleSettingsFilter = Schema.makeFilter(ruleSettingsValidation)

// RuleSettings separates the wildcard selector from registered names because both share one map.
export const RuleSettings = RuleSettingsRecord.check(ruleSettingsFilter)

const hasText = (file: string) => {
  const normalized = file.trim()

  return normalized.length > 0
}

const configFilesAreValid = (files: ReadonlyArray<string>) => {
  const hasFiles = files.length > 0
  const validFiles = Array.every(files, hasText)
  const requirements = Array.make(hasFiles, validFiles)

  return Array.every(requirements, Boolean)
}

const configFilesValidation = (files: ReadonlyArray<string>) =>
  configFilesAreValid(files)
    ? true
    : "Config files must be a non-empty array of non-empty glob strings"

const configFilesFilter = Schema.makeFilter(configFilesValidation)
const ConfigFiles = ConfigFileArray.check(configFilesFilter)

// LintConfigEntry binds file selection to rule settings because each scope applies both together.
export const LintConfigEntry = Schema.Struct({
  files: ConfigFiles,
  rules: RuleSettings
})

export interface LintConfigEntry extends Schema.Schema.Type<typeof LintConfigEntry> {}

const LintConfigEntries = Schema.Array(LintConfigEntry)

const configValidation = (config: ReadonlyArray<LintConfigEntry>) =>
  config.length > 0 ? true : "Lint config must contain at least one entry"

const configFilter = Schema.makeFilter(configValidation)

// LintConfig preserves entry order because later matching scopes override earlier scopes.
export const LintConfig = LintConfigEntries.check(configFilter)

export interface LintConfig extends Schema.Schema.Type<typeof LintConfig> {}

export const defineConfig = Schema.decodeSync(LintConfig)

export const defaultConfig = defineConfig([{ files: ["**/*"], rules: { "*": "error" } }])
