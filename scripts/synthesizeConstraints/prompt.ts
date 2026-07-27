import { Array, Function, Option } from "effect"
import {
  type Concept,
  ConstraintDraft,
  ConstraintPlan,
  DefinitionDraft,
  type Finding,
  type Repair,
  StageSpec,
  type Technology,
  TechnologyInventory,
  TermInventory,
  type ViolationClass,
  ViolationEnumeration
} from "./data.ts"

const preambleLines = Array.make(
  "You synthesize part of a falsifiable constraint document for a TypeScript project.",
  "",
  "Reason from first principles. Derive from the properties that make the requested quality true, never from repository practice.",
  "You MUST NOT read anything under docs/, adrs/, or .claude/: prior synthesis would pollute your reasoning.",
  "You return structured data only. Never write Markdown, headings, numbering, or cross-reference links; the harness renders all of that.",
  "Write defined terms as plain prose. The harness inserts every inline link mechanically, so a link you write becomes a defect."
)

const preamble = Array.join(preambleLines, "\n")

const fenceRuleLines = Array.make(
  "## How your snippets are checked",
  "",
  "Each snippet is compiled on its own under `strict`, `module: NodeNext`, and `moduleResolution: NodeNext`. Write snippets that pass that compiler.",
  "- Every relative import MUST carry an explicit extension: `./thing.js` or `./thing.ts`. An extensionless relative import is a compile error under NodeNext.",
  "- A relative import denotes a hypothetical neighbouring module. The harness materialises the names you import from it, so you may show an import edge without defining the neighbour. Use this to demonstrate dependency direction, cycles, and boundary crossings.",
  "- Package imports resolve against the project's installed dependencies. `typescript`, `effect`, and `node:*` are available.",
  "- Declare or import every other identifier you reference, and keep names, types, and described behaviour in agreement.",
  "- A `json` or `jsonc` snippet MUST contain only that format. Never put TypeScript in a data snippet; use a `ts` snippet instead.",
  "- Two snippets never share a scope, so reusing a name across snippets is fine."
)

const fenceRules = Array.join(fenceRuleLines, "\n")

const prefixBullet = (line: string) => `- ${line}`

const bullet = (lines: ReadonlyArray<string>) => {
  const prefixed = Array.map(lines, prefixBullet)

  return Array.join(prefixed, "\n")
}

const conceptBlock = (concept: Concept) => {
  const lines = Array.make("## Requested concept", "", concept.request)

  return Array.join(lines, "\n")
}

const technologySection = (technology: Technology) => {
  const heading = `### ${technology.name}`
  const surfaces = bullet(technology.surfaces)
  const lines = Array.make(heading, surfaces)

  return Array.join(lines, "\n")
}

const technologyBlock = (technologies: ReadonlyArray<Technology>) => {
  const sections = Array.map(technologies, technologySection)
  const header = Array.make("## Technology surfaces already inventoried", "")
  const lines = Array.appendAll(header, sections)

  return Array.join(lines, "\n")
}

const violationBullet = (violation: ViolationClass) =>
  `- \`${violation.id}\` (${violation.technology}): ${violation.summary} Observable: ${violation.observable}`

const violationBlock = (violations: ReadonlyArray<ViolationClass>) => {
  const bullets = Array.map(violations, violationBullet)
  const header = Array.make("## Violation classes already enumerated", "")
  const lines = Array.appendAll(header, bullets)

  return Array.join(lines, "\n")
}

const termBlock = (terms: ReadonlyArray<string>) => {
  const listed = bullet(terms)
  const lines = Array.make("## Terms the glossary defines", "", listed)

  return Array.join(lines, "\n")
}

const findingBullet = (finding: Finding) => `- [${finding.code}] ${finding.message}`

const repairBlock = (repair: Repair) => {
  const previousJson = JSON.stringify(repair.previous, null, 2)
  const findingLines = Array.map(repair.findings, findingBullet)

  const header = Array.make(
    "## Payload you previously returned",
    "",
    "```json",
    previousJson,
    "```",
    "",
    "## Findings you MUST fix",
    "",
    "The payload above failed these mechanical checks. Return a corrected payload of the same shape. Fix every finding and change nothing else.",
    "This payload exists only in this message. Do not search the repository for it; there is no file to locate or edit.",
    ""
  )

  const lines = Array.appendAll(header, findingLines)

  return Array.join(lines, "\n")
}

const emptyLines: ReadonlyArray<string> = Array.empty()
const noRepairLines = Function.constant(emptyLines)

const repairTaskLines = (repair: Repair) => {
  const block = repairBlock(repair)

  return Array.make("", block)
}

const repairLinesFrom = (repair: Option.Option<Repair>) =>
  Option.match(repair, {
    onNone: noRepairLines,
    onSome: repairTaskLines
  })

const sourceTools = Array.make("read", "grep", "glob")
const emptyTools = Array.empty<string>()

const planStageName = (repair: Option.Option<Repair>) =>
  Option.match(repair, {
    onNone: Function.constant("plan"),
    onSome: Function.constant("plan:repair")
  })

const definitionStageName = (term: string, repair: Option.Option<Repair>) => {
  const base = `definition:${term}`
  const repaired = `definition:${term}:repair`

  return Option.match(repair, {
    onNone: Function.constant(base),
    onSome: Function.constant(repaired)
  })
}

const constraintStageName = (title: string, repair: Option.Option<Repair>) => {
  const base = `constraint:${title}`
  const repaired = `constraint:${title}:repair`

  return Option.match(repair, {
    onNone: Function.constant(base),
    onSome: Function.constant(repaired)
  })
}

const constraintViolationBullet = (violation: ViolationClass) =>
  `- \`${violation.id}\`: ${violation.summary} Observable: ${violation.observable}`

export const makeTechnologyStage = (concept: Concept): StageSpec<TechnologyInventory> => {
  const systemPromptLines = Array.make(
    preamble,
    "",
    "You inventory technologies and their surfaces. Enumerate every facility that could affect the requested quality, not the ones that usually matter. This inventory is a coverage obligation for later stages: a surface you omit becomes a rule nobody writes."
  )

  const systemPrompt = Array.join(systemPromptLines, "\n")
  const conceptSection = conceptBlock(concept)

  const taskLines = Array.make(
    conceptSection,
    "",
    "Inventory every technology the request explicitly names, plus TypeScript itself. For each, enumerate every facility, type-system feature, configuration surface, lifecycle, boundary, and composition mechanism that can affect the requested quality. Consult installed or vendored library source when an API's current shape matters."
  )

  const task = Array.join(taskLines, "\n")

  return new StageSpec({
    stage: "technology",
    systemPrompt,
    tools: sourceTools,
    schema: TechnologyInventory,
    task
  })
}

export const makeViolationStage = (
  concept: Concept,
  technologies: ReadonlyArray<Technology>
): StageSpec<ViolationEnumeration> => {
  const systemPromptLines = Array.make(
    preamble,
    "",
    "You enumerate failures. A violation class is one independently observable way the quality breaks, stated as something an artifact does. Test each technology alone and then test their interactions. Treat structural modularity as its own dimension: file placement, basename and suffix, module specifier form, permitted imports, dependency direction, content-derived module role, declaration order, permitted top-level contents, and permitted exports.",
    "Do not stop at a tidy count. The enumeration ends when no unaddressed surface can break the quality."
  )

  const systemPrompt = Array.join(systemPromptLines, "\n")
  const conceptSection = conceptBlock(concept)
  const technologiesSection = technologyBlock(technologies)

  const taskLines = Array.make(
    conceptSection,
    "",
    technologiesSection,
    "",
    "Enumerate every independently observable way the requested quality can fail. Cover each surface above, then their interactions. For each failure, state the mechanically observable evidence that it occurred."
  )

  const task = Array.join(taskLines, "\n")

  return new StageSpec({
    stage: "violation",
    systemPrompt,
    tools: emptyTools,
    schema: ViolationEnumeration,
    task
  })
}

export const makeTermStage = (
  concept: Concept,
  technologies: ReadonlyArray<Technology>,
  violations: ReadonlyArray<ViolationClass>
): StageSpec<TermInventory> => {
  const systemPromptLines = Array.make(
    preamble,
    "",
    "You write the orienting definition and inventory the vocabulary the rules require.",
    "A term is necessary when omitting its definition would leave a reader unable to decide whether a constraint applies. That includes precisely-qualified verbs and states such as defer, execute, expose, own, and escape, and every qualifier such as permitted, public, production, or cross-boundary.",
    "The informal definition must orient a technically literate reader in ordinary language. It must not state a requirement, a predicate, a formal term, or any code."
  )

  const systemPrompt = Array.join(systemPromptLines, "\n")
  const conceptSection = conceptBlock(concept)
  const technologiesSection = technologyBlock(technologies)
  const violationsSection = violationBlock(violations)

  const taskLines = Array.make(
    conceptSection,
    "",
    technologiesSection,
    "",
    violationsSection,
    "",
    "Write the informal definition, then inventory every term the constraints will rely on. For each term, record which other terms in the inventory its definition will depend on, so the glossary can be ordered."
  )

  const task = Array.join(taskLines, "\n")

  return new StageSpec({
    stage: "term",
    systemPrompt,
    tools: emptyTools,
    schema: TermInventory,
    task
  })
}

export const makePlanStage = (
  concept: Concept,
  violations: ReadonlyArray<ViolationClass>,
  repair: Option.Option<Repair>
): StageSpec<ConstraintPlan> => {
  const stage = planStageName(repair)

  const systemPromptLines = Array.make(
    preamble,
    "",
    "You assign violation classes to rules. Coverage runs in both directions: every class must be claimed by at least one rule, and every rule must be necessary for at least one class. Prefer the smallest rule that rejects a class; split whenever one statement would have to cover unrelated failures.",
    "The rule count is determined by the enumeration, not by tidiness."
  )

  const systemPrompt = Array.join(systemPromptLines, "\n")
  const conceptSection = conceptBlock(concept)
  const violationsSection = violationBlock(violations)

  const baseTaskLines = Array.make(
    conceptSection,
    "",
    violationsSection,
    "",
    "Assign every violation class id above to a rule. Give each rule a short noun-phrase title naming its subject."
  )

  const repairLines = repairLinesFrom(repair)
  const taskLines = Array.appendAll(baseTaskLines, repairLines)
  const task = Array.join(taskLines, "\n")

  return new StageSpec({
    stage,
    systemPrompt,
    tools: emptyTools,
    schema: ConstraintPlan,
    task
  })
}

export const makeDefinitionStage = (
  concept: Concept,
  term: string,
  terms: ReadonlyArray<string>,
  repair: Option.Option<Repair>
): StageSpec<DefinitionDraft> => {
  const stage = definitionStageName(term, repair)

  const systemPromptLines = Array.make(
    preamble,
    "",
    "You define one term.",
    "The definition must identify observable boundaries. It must not rely on a path, directory, basename, file extension, package layout, declaration or export name, user mapping, or presumed intent when it classifies meaning. A physical-file criterion may constrain location or spelling but must never assign a semantic role.",
    "You MUST NOT invent or require a manifest, registry, allowlist, or any configuration that assigns roles, kinds, or permissions to individual artifacts. If a category cannot be inferred deterministically, reformulate it around observable implementation behaviour.",
    "The mechanical predicate is the classifier every later verification reuses. State its inputs, its deterministic procedure, and its Boolean membership result, then implement it in TypeScript that type-checks against its stated imports.",
    "Every example must be complete and independently type-checkable: declare or import every identifier, and keep names, types, and described behaviour in agreement. Put each comment immediately adjacent to what it identifies.",
    "Add a related-terms comparison only where a plausible confusable concept exists. Never invent a distinction.",
    "For Effect, declare tagged failures with Schema.TaggedErrorClass; never hand-roll a class with an _tag field. Consult vendored Effect source before drafting an Effect example."
  )

  const systemPrompt = Array.join(systemPromptLines, "\n")
  const conceptSection = conceptBlock(concept)
  const termsSection = termBlock(terms)

  const baseTaskLines = Array.make(
    conceptSection,
    "",
    fenceRules,
    "",
    termsSection,
    "",
    "## Term to define",
    "",
    term
  )

  const repairLines = repairLinesFrom(repair)
  const taskLines = Array.appendAll(baseTaskLines, repairLines)
  const task = Array.join(taskLines, "\n")

  return new StageSpec({
    stage,
    systemPrompt,
    tools: sourceTools,
    schema: DefinitionDraft,
    task
  })
}

export const makeConstraintStage = (
  concept: Concept,
  title: string,
  violations: ReadonlyArray<ViolationClass>,
  terms: ReadonlyArray<string>,
  repair: Option.Option<Repair>
): StageSpec<ConstraintDraft> => {
  const stage = constraintStageName(title, repair)

  const systemPromptLines = Array.make(
    preamble,
    "",
    "You write one rule.",
    "A constraint narrows acceptable designs. It is not a restatement of the goal, an aesthetic preference, an implementation suggestion, or an unqualified example.",
    "Verification may use static analysis, compilation, tests, executable models, property testing, runtime instrumentation, or generated evidence. Unusual mechanisms are welcome. When existing tooling cannot verify the rule, propose the tooling or proof obligation that would; never substitute human review and never weaken the rule because verification is hard.",
    "Do not create catch-all exceptions, compatibility shims, or escape hatches. Do not hedge with phrases such as where practical or as needed.",
    "The allowed and violating examples must differ only in what the rule governs, and both must type-check independently against their stated imports.",
    "A semantic role referenced by the rule must be decided by the content-derived predicate its definition states, never rederived from a filename or directory."
  )

  const systemPrompt = Array.join(systemPromptLines, "\n")
  const conceptSection = conceptBlock(concept)
  const termsSection = termBlock(terms)
  const violationLines = Array.map(violations, constraintViolationBullet)

  const prefix = Array.make(
    conceptSection,
    "",
    fenceRules,
    "",
    termsSection,
    "",
    "## Violation classes this rule must reject",
    ""
  )

  const subjectLines = Array.make("", "## Rule subject", "", title)
  const withViolations = Array.appendAll(prefix, violationLines)
  const withSubject = Array.appendAll(withViolations, subjectLines)
  const repairLines = repairLinesFrom(repair)
  const taskLines = Array.appendAll(withSubject, repairLines)
  const task = Array.join(taskLines, "\n")

  return new StageSpec({
    stage,
    systemPrompt,
    tools: sourceTools,
    schema: ConstraintDraft,
    task
  })
}
