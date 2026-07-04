import { Array, Schema } from "effect"
import { RuleExample, isFindingRule } from "../rules/index.js"
import type { ExampleSnippet, Rule } from "../rules/index.js"

class RuleDoc extends Schema.Class<RuleDoc>("RuleDoc")({
  id: Schema.String,
  description: Schema.String,
  example: RuleExample
}) {}

const ruleDocsSchema = Schema.Array(RuleDoc)

class RulesDocument extends Schema.Class<RulesDocument>("RulesDocument")({
  rules: ruleDocsSchema
}) {}

const labeledSnippet =
  (label: string) =>
  (snippet: ExampleSnippet): string =>
    `${label} (${snippet.filePath}):\n\n\`\`\`ts\n${snippet.code}\n\`\`\``

const contextSnippet = labeledSnippet("Context")

const badSnippet = labeledSnippet("Bad")

const goodSnippet = labeledSnippet("Good")

const ruleSection = (rule: Rule): string => {
  const heading = `## ${rule.id}`
  const contextSections = Array.map(rule.example.context, contextSnippet)
  const badSections = Array.map(rule.example.bad, badSnippet)
  const goodSections = Array.map(rule.example.good, goodSnippet)
  const sections = Array.flatten([
    [heading, rule.description],
    contextSections,
    badSections,
    goodSections
  ])

  return Array.join(sections, "\n\n")
}

// The guide is pasted into agent system prompts as law, so it teaches finding rules only: a signal rule printed here would be obeyed as a command (see adrs/0001-layered-match-interpretation.md).
export const formatRulesGuide = (allRules: ReadonlyArray<Rule>): string => {
  const rules = allRules.filter(isFindingRule)
  const heading = "# Better TypeScript style guide"
  const summary =
    `Better TypeScript enforces ${rules.length} rules on every TypeScript file it checks. ` +
    "Every match must be fixed by changing the code; there are no suppressions, severity " +
    "levels, or per-rule configuration. Write code that satisfies every rule below."
  const philosophy =
    "Fix causes, not instances. A match is a symptom, and the smallest edit that " +
    "silences it is usually the wrong one: renaming, type-laundering, or extracting an " +
    "apology helper trades one match for a worse design. When matches cluster in a " +
    "file, the file's architecture is fighting this guide — reach for the architectural " +
    "form instead: hold state in Ref, SynchronizedRef, or PubSub inside the Effect " +
    "runtime, express sequencing with Effect.gen, wire dependencies through Layer, and " +
    "enter the runtime once at the program's edge. Rewrite the shape and the matches " +
    "dissolve."
  const intro = `${heading}\n\n${summary}\n\n${philosophy}`
  const sections = Array.map(rules, ruleSection)
  const parts = Array.prepend(sections, intro)

  return Array.join(parts, "\n\n")
}

const ruleDoc = (rule: Rule): RuleDoc =>
  new RuleDoc({
    id: rule.id,
    description: rule.description,
    example: rule.example
  })

export const formatRulesJson = (allRules: ReadonlyArray<Rule>): string => {
  const findingRules = allRules.filter(isFindingRule)
  const docs = Array.map(findingRules, ruleDoc)
  const document = new RulesDocument({ rules: docs })

  return JSON.stringify(document, null, 2)
}
