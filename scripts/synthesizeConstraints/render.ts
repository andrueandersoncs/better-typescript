import { Array, Function, HashMap, Match, Option, Struct, flow, pipe } from "effect"
import { termAnchors } from "./anchor.ts"
import { Example } from "./data.ts"
import type { Constraint, ConstraintDocument, Definition, RelatedTerm } from "./data.ts"
import { linkTerms } from "./link.ts"

// renderDocument owns Markdown shape because the audit checks rendered headings.

const pipeCharacters = /\|/gu
const whitespaceRuns = /\s+/gu
const trailingWhitespace = /\s+$/u
const relatedTermsHeading = "#### Related terms"

const relatedTermsHeader =
  "| Term | Relation | Deciding distinction | Why it is not interchangeable here |"

const relatedTermsDivider = "| --- | --- | --- | --- |"
const predicateImplementationHeading = "**Predicate implementation:**"
const propertyProtectedHeading = "#### Property protected"
const rationaleHeading = "#### Rationale"
const verificationImplementationHeading = "**Verification implementation:**"
const allowedHeading = "**Allowed:**"
const violatingHeading = "**Violating:**"
const informalDefinitionHeading = "## Informal definition"
const definitionsHeading = "## Definitions"
const constraintsHeading = "## Constraints"
const thisExamplePrefix = Function.constant("**This:**\n\n")
const notThisExamplePrefix = Function.constant("**Not this:**\n\n")
const plainExamplePrefix = Function.constant("")
const emptySections = Array.empty<string>()
const noSelfTerm = Option.none<string>()

const stripTrailingWhitespace = (code: string) => code.replace(trailingWhitespace, "")

const fence = (language: string, code: string) => {
  const trimmed = stripTrailingWhitespace(code)
  const open = `\`\`\`${language}`
  const lines = Array.make(open, trimmed, "```")

  return Array.join(lines, "\n")
}

const examplePrefix = (label: Example["label"]) =>
  pipe(
    Match.value(label),
    Match.when("this", thisExamplePrefix),
    Match.when("notThis", notThisExamplePrefix),
    Match.when("plain", plainExamplePrefix),
    Match.exhaustive
  )

const labelled = (example: Example) => {
  const prefix = examplePrefix(example.label)
  const body = fence(example.language, example.code)

  return `${prefix}${body}`
}

const cell = (value: string) => {
  const escaped = value.replace(pipeCharacters, "\\|")
  const collapsed = escaped.replace(whitespaceRuns, " ")

  return collapsed.trim()
}

// Comparison examples render unlabelled because they contrast neighbours, not a contrary.
const plainComparison = (example: Example) =>
  Example.make({
    label: "plain",
    language: example.language,
    demonstrates: example.demonstrates,
    code: example.code
  })

const renderComparison = flow(plainComparison, labelled)

const formatRelatedTerm = (linkCell: (value: string) => string) => (related: RelatedTerm) => {
  const term = linkCell(related.term)
  const relation = linkCell(related.relation)
  const distinction = linkCell(related.decidingDistinction)
  const why = linkCell(related.whyNotInterchangeable)
  const cells = Array.make(term, relation, distinction, why)
  const body = Array.join(cells, " | ")

  return `| ${body} |`
}

const relatedTermsTable = (definition: Definition, anchors: HashMap.HashMap<string, string>) => {
  if (Array.isReadonlyArrayEmpty(definition.relatedTerms)) {
    return emptySections
  }

  const selfTerm = Option.some(definition.term)
  const link = linkTerms(anchors, selfTerm)
  const linkCell = flow(link, cell)
  const rowFor = formatRelatedTerm(linkCell)
  const rows = Array.map(definition.relatedTerms, rowFor)
  const headerLines = Array.make(relatedTermsHeader, relatedTermsDivider)
  const tableLines = Array.appendAll(headerLines, rows)
  const table = Array.join(tableLines, "\n")
  const comparisonBlocks = Array.map(definition.comparisonExamples, renderComparison)
  const base = Array.make(relatedTermsHeading, table)

  return Array.appendAll(base, comparisonBlocks)
}

const renderDefinition = (definition: Definition, anchors: HashMap.HashMap<string, string>) => {
  const selfTerm = Option.some(definition.term)
  const link = linkTerms(anchors, selfTerm)
  const heading = `### ${definition.term}`
  const prose = link(definition.prose)
  const related = relatedTermsTable(definition, anchors)
  const predicate = `**Mechanical predicate:** ${link(definition.mechanicalPredicate)}`
  const implementation = fence("ts", definition.predicateImplementation)
  const exampleBlocks = Array.map(definition.examples, labelled)
  const head = Array.make(heading, prose)
  const withRelated = Array.appendAll(head, related)
  const middle = Array.make(predicate, predicateImplementationHeading, implementation)
  const withMiddle = Array.appendAll(withRelated, middle)
  const parts = Array.appendAll(withMiddle, exampleBlocks)

  return Array.join(parts, "\n\n")
}

const renderConstraint = (
  constraint: Constraint,
  position: number,
  anchors: HashMap.HashMap<string, string>
) => {
  const link = linkTerms(anchors, noSelfTerm)
  const heading = `### ${position}. ${constraint.title}`
  const statement = link(constraint.statement)
  const propertyProtected = link(constraint.propertyProtected)
  const rationale = link(constraint.rationale)
  const verification = `**Verification:** ${link(constraint.verification)}`
  const verificationImplementation = fence("ts", constraint.verificationImplementation)
  const allowedExample = fence("ts", constraint.allowedExample)
  const violatingExample = fence("ts", constraint.violatingExample)

  const parts = Array.make(
    heading,
    statement,
    propertyProtectedHeading,
    propertyProtected,
    rationaleHeading,
    rationale,
    verification,
    verificationImplementationHeading,
    verificationImplementation,
    allowedHeading,
    allowedExample,
    violatingHeading,
    violatingExample
  )

  return Array.join(parts, "\n\n")
}

const renderDefinitionOn = (anchors: HashMap.HashMap<string, string>) => (definition: Definition) =>
  renderDefinition(definition, anchors)

const renderConstraintOn =
  (anchors: HashMap.HashMap<string, string>) => (constraint: Constraint, index: number) => {
    const position = index + 1

    return renderConstraint(constraint, position, anchors)
  }

export const renderDocument = (document: ConstraintDocument) => {
  const terms = Array.map(document.definitions, Struct.get("term"))
  const anchors = termAnchors(terms)
  const renderOneDefinition = renderDefinitionOn(anchors)
  const renderOneConstraint = renderConstraintOn(anchors)
  const definitionBlocks = Array.map(document.definitions, renderOneDefinition)
  const constraintBlocks = Array.map(document.constraints, renderOneConstraint)
  const title = `# ${document.title}`
  // Informal prose stays unlinked because it must introduce no formal terminology.

  const prefix = Array.make(
    title,
    informalDefinitionHeading,
    document.informalDefinition,
    definitionsHeading
  )

  const withDefinitions = Array.appendAll(prefix, definitionBlocks)
  const withConstraintsHeading = Array.append(withDefinitions, constraintsHeading)
  const sections = Array.appendAll(withConstraintsHeading, constraintBlocks)
  const body = Array.join(sections, "\n\n")

  return `${body}\n`
}
