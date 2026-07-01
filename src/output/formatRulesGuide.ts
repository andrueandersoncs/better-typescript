import { Array, Schema } from "effect"
import { RuleExample } from "../rules/index.js"
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

const badSnippet = labeledSnippet("Bad")

const goodSnippet = labeledSnippet("Good")

const ruleSection = (rule: Rule): string => {
  const heading = `## ${rule.id}`
  const badSections = Array.map(rule.example.bad, badSnippet)
  const goodSections = Array.map(rule.example.good, goodSnippet)
  const sections = Array.flatten([
    [heading, rule.description],
    badSections,
    goodSections
  ])

  return Array.join(sections, "\n\n")
}

export const formatRulesGuide = (rules: ReadonlyArray<Rule>): string => {
  const heading = "# Better TypeScript style guide"
  const summary =
    `Better TypeScript enforces ${rules.length} rules on every TypeScript file it checks. ` +
    "Every match must be fixed by changing the code; there are no suppressions, severity " +
    "levels, or per-rule configuration. Write code that satisfies every rule below."
  const intro = `${heading}\n\n${summary}`
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

export const formatRulesJson = (rules: ReadonlyArray<Rule>): string => {
  const docs = Array.map(rules, ruleDoc)
  const document = new RulesDocument({ rules: docs })

  return JSON.stringify(document, null, 2)
}
