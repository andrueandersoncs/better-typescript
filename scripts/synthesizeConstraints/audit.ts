import {
  Array,
  Data,
  Equivalence,
  Function,
  HashMap,
  HashSet,
  Option,
  Result,
  Struct,
  Tuple,
  flow,
  pipe
} from "effect"
import { assignAnchors, headingTexts, linkTargets, termAnchors } from "./anchor.ts"
import {
  Finding,
  type Constraint,
  type ConstraintDocument,
  type Definition,
  type Example,
  type Ordering,
  type ViolationClass
} from "./data.ts"
import { stripFences } from "./fence.ts"
import { unlinkedTerms } from "./link.ts"

const valuesEqual =
  <A>(left: A) =>
  <B>(right: B) =>
    Equivalence.strictEqual<A | B>()(left, right)

const isZero = valuesEqual(0)
const emptyString = ""
const isEmptyString = valuesEqual(emptyString)
const documentUnit = "document"
const constraintsHeading = "Constraints"
const requiredSectionOrder = "Informal definition|Definitions|Constraints"
const definitionsHeadingPattern = /^## Definitions[ \t]*$/mu
const informalHeadingPattern = /^## Informal definition[ \t]*$/mu
const h3HeadingPattern = /^#{3}[ \t]+(.+?)[ \t]*$/u
const anyHeadingPattern = /^#{1,6}[ \t]/u
const rfc2119 = /\b(?:MUST NOT|MUST|SHOULD NOT|SHOULD|MAY NOT|MAY)\b/u
const booleanMembership = /\b(?:return|true|false|boolean)\b/iu
const exportKeyword = /\bexport\b/u
const fenceMarker = "```"
const mechanicalPredicateHeading = "Mechanical predicate"
const cycleArrow = " -> "
const notThisLabel = "notThis"
const thisLabel = "this"
const newline = "\n"

// Escape hatch phrases because they turn a rule into an unfalsifiable preference.
const escapeHatches = Array.make(
  "if possible",
  "where practical",
  "where appropriate",
  "as needed",
  "best effort",
  "at the maintainer's discretion",
  "unless necessary",
  "should generally",
  "escape hatch",
  "opt out"
)

// Forbidden subsection titles because the command bans them outright.
const forbiddenSubsections = Array.make("Failure mode", "Scope", "Exceptions")

const requiredSectionNames = Array.make("Informal definition", "Definitions", "Constraints")
const requiredSectionSet = HashSet.fromIterable(requiredSectionNames)

const emptyFindings: ReadonlyArray<Finding> = Array.empty()
const noFindings = Function.constant(emptyFindings)

const findingsFromResult = Result.match({
  onFailure: noFindings,
  onSuccess: Array.of
})

const keepFinding = (condition: boolean) => (finding: Finding) =>
  condition ? Result.succeed(finding) : Result.failVoid

const isRequiredSection = (heading: string) => HashSet.has(requiredSectionSet, heading)

const isEmptyText = flow((value: string) => value.trim(), isEmptyString)

const definitionUnit = (index: number) => `definition/${index}`

const constraintUnit = (index: number) => `constraint/${index}`

const makeFinding = (unit: string) => (heading: string) => (code: string) => (message: string) =>
  Finding.make({ code, unit, heading, message })

const makeDocumentFinding = makeFinding(documentUnit)

const foldCase = (value: string) => value.toLowerCase()

const hasRfc2119 = (text: string) => rfc2119.test(text)

const hasBooleanMembership = (text: string) => booleanMembership.test(text)

const hasExportKeyword = (text: string) => exportKeyword.test(text)

const hasFenceMarker = (text: string) => text.includes(fenceMarker)

const hasMechanicalPredicateHeading = (text: string) => text.includes(mechanicalPredicateHeading)

const isNotThisLabel = valuesEqual(notThisLabel)

const isThisLabel = valuesEqual(thisLabel)

const exampleLabel = (example: Example) => Struct.get(example, "label")

const isNotThisExample = flow(exampleLabel, isNotThisLabel)

const isThisExample = flow(exampleLabel, isThisLabel)

const exampleDemonstrates = (example: Example) => Struct.get(example, "demonstrates")

const lowerDemonstrates = flow(exampleDemonstrates, Array.map(foldCase))

const termOf = (definition: Definition) => Struct.get(definition, "term")

const classIdOf = (violation: ViolationClass) => Struct.get(violation, "id")

const summaryOf = (violation: ViolationClass) => Struct.get(violation, "summary")

const titleOf = (constraint: Constraint) => Struct.get(constraint, "title")

const claimedIdsOf = (constraint: Constraint) => Struct.get(constraint, "violationClassIds")

const splitDefinitions = (text: string) => text.split(definitionsHeadingPattern)

const splitInformal = (text: string) => text.split(informalHeadingPattern)

const beforeDefinitions = (text: string) => {
  const parts = splitDefinitions(text)

  return Array.get(parts, 0)
}

const informalBody = (before: string) => {
  const parts = splitInformal(before)

  return Array.get(parts, 1)
}

const informalSection = (prose: string) => {
  const prefix = beforeDefinitions(prose)

  return Option.flatMap(prefix, informalBody)
}

const sectionOrderFindings = (title: string) => (headings: ReadonlyArray<string>) => {
  const sectionOrder = Array.filter(headings, isRequiredSection)
  const found = Array.join(sectionOrder, "|")
  const correct = valuesEqual(requiredSectionOrder)(found)

  if (correct) {
    return emptyFindings
  }

  const message = `Required sections must appear exactly once in order; found ${JSON.stringify(sectionOrder)}.`
  const finding = makeDocumentFinding(title)("S2")(message)

  return Array.of(finding)
}

const emptyInformalMessage = "The informal definition is empty."

const informalFindings = (title: string) => (markdown: string) => (prose: string) => {
  const find = makeDocumentFinding(title)
  const emptyFinding = find("S3")(emptyInformalMessage)
  const informalOption = informalSection(prose)

  if (Option.isNone(informalOption)) {
    return Array.of(emptyFinding)
  }

  const informal = informalOption.value
  const emptyInformal = isEmptyText(informal)

  if (emptyInformal) {
    return Array.of(emptyFinding)
  }

  const normative = hasRfc2119(informal)
  const mechanical = hasMechanicalPredicateHeading(informal)
  const markdownPrefix = beforeDefinitions(markdown)
  const fencePresent = Option.exists(markdownPrefix, hasFenceMarker)

  const normativeFinding = find("S3")(
    "The informal definition must not state normative requirements."
  )

  const mechanicalFinding = find("S3")(
    "The informal definition must not state a mechanical predicate."
  )

  const fenceFinding = find("S3")("The informal definition must not contain a code example.")
  const normativeResult = keepFinding(normative)(normativeFinding)
  const mechanicalResult = keepFinding(mechanical)(mechanicalFinding)
  const fenceResult = keepFinding(fencePresent)(fenceFinding)
  const results = Array.make(normativeResult, mechanicalResult, fenceResult)

  return Array.filterMap(results, Function.identity)
}

const emptyDefinitionsFindings = (title: string) => (definitions: ReadonlyArray<Definition>) => {
  const empty = isZero(definitions.length)

  if (!empty) {
    return emptyFindings
  }

  const finding = makeDocumentFinding(title)("S4")("The document defines no terms.")

  return Array.of(finding)
}

const emptyConstraintsFindings = (title: string) => (constraints: ReadonlyArray<Constraint>) => {
  const empty = isZero(constraints.length)

  if (!empty) {
    return emptyFindings
  }

  const finding = makeDocumentFinding(title)("S4")("The document states no constraints.")

  return Array.of(finding)
}

const forbiddenPresent = (headings: ReadonlyArray<string>) => (forbidden: string) =>
  Array.contains(headings, forbidden)

const forbiddenFinding =
  (title: string) => (headings: ReadonlyArray<string>) => (forbidden: string) => {
    const present = forbiddenPresent(headings)(forbidden)

    if (!present) {
      return Result.failVoid
    }

    const message = `Subsection ${JSON.stringify(forbidden)} is prohibited.`
    const finding = makeDocumentFinding(title)("C3")(message)

    return Result.succeed(finding)
  }

const forbiddenSubsectionFindings = (title: string) => (headings: ReadonlyArray<string>) => {
  const toFinding = forbiddenFinding(title)(headings)

  return Array.filterMap(forbiddenSubsections, toFinding)
}

const missingAnchor = (anchors: HashSet.HashSet<string>) => (target: string) => {
  const present = HashSet.has(anchors, target)

  return !present
}

const brokenLinkFinding = (title: string) => (target: string) =>
  makeDocumentFinding(title)("L1")(`Link target #${target} matches no heading.`)

const brokenLinkFindings =
  (title: string) => (prose: string) => (headings: ReadonlyArray<string>) => {
    const assigned = assignAnchors(headings)
    const anchors = HashSet.fromIterable(assigned)
    const targets = linkTargets(prose)
    const uniqueTargets = HashSet.fromIterable(targets)
    const targetList = Array.fromIterable(uniqueTargets)
    const isMissing = missingAnchor(anchors)
    const missing = Array.filter(targetList, isMissing)
    const toFinding = brokenLinkFinding(title)

    return Array.map(missing, toFinding)
  }

const documentFindings = (markdown: string) => (document: ConstraintDocument) => {
  const title = document.title
  const prose = stripFences(markdown)
  const headings = headingTexts(prose)
  const sections = sectionOrderFindings(title)(headings)
  const informal = informalFindings(title)(markdown)(prose)
  const definitions = emptyDefinitionsFindings(title)(document.definitions)
  const constraints = emptyConstraintsFindings(title)(document.constraints)
  const forbidden = forbiddenSubsectionFindings(title)(headings)
  const links = brokenLinkFindings(title)(prose)(headings)

  return pipe(
    sections,
    Array.appendAll(informal),
    Array.appendAll(definitions),
    Array.appendAll(constraints),
    Array.appendAll(forbidden),
    Array.appendAll(links)
  )
}

const allExamples = (definition: Definition) => {
  const examples = definition.examples
  const comparisons = definition.comparisonExamples

  return Array.appendAll(examples, comparisons)
}

const demonstratedSet = (definition: Definition) => {
  const examples = allExamples(definition)
  const items = Array.flatMap(examples, lowerDemonstrates)

  return HashSet.fromIterable(items)
}

const contraryDemonstratedSet = (definition: Definition) => {
  const examples = definition.examples
  const notThis = Array.filter(examples, isNotThisExample)
  const items = Array.flatMap(notThis, lowerDemonstrates)

  return HashSet.fromIterable(items)
}

const missingFromSet = (demonstrated: HashSet.HashSet<string>) => (item: string) => {
  const key = foldCase(item)
  const shown = HashSet.has(demonstrated, key)

  return !shown
}

const d3Finding =
  (find: (code: string) => (message: string) => Finding) =>
  (demonstrated: HashSet.HashSet<string>) =>
  (item: string) => {
    const missing = missingFromSet(demonstrated)(item)

    if (!missing) {
      return Result.failVoid
    }

    const message = `Enumerated item ${JSON.stringify(item)} has no labelled example.`
    const finding = find("D3")(message)

    return Result.succeed(finding)
  }

const d4ContraryFinding =
  (find: (code: string) => (message: string) => Finding) =>
  (demonstrated: HashSet.HashSet<string>) =>
  (contrary: string) => {
    const missing = missingFromSet(demonstrated)(contrary)

    if (!missing) {
      return Result.failVoid
    }

    const message = `Contrary case ${JSON.stringify(contrary)} has no "Not this" example.`
    const finding = find("D4")(message)

    return Result.succeed(finding)
  }

const oneDefinitionFindings = (definition: Definition, index: number) => {
  const unit = definitionUnit(index)
  const heading = definition.term
  const find = makeFinding(unit)(heading)
  const proseEmpty = isEmptyText(definition.prose)
  const predicateEmpty = isEmptyText(definition.mechanicalPredicate)
  const implementationEmpty = isEmptyText(definition.predicateImplementation)
  const noExamples = isZero(definition.examples.length)
  const proseFinding = find("D1")("Prose is empty.")
  const predicateFinding = find("D1")("Mechanical predicate is missing.")
  const implementationFinding = find("D1")("Predicate implementation is missing.")
  const examplesFinding = find("D2")("The entry has no example.")
  const proseResult = keepFinding(proseEmpty)(proseFinding)
  const predicateResult = keepFinding(predicateEmpty)(predicateFinding)
  const implementationResult = keepFinding(implementationEmpty)(implementationFinding)
  const examplesResult = keepFinding(noExamples)(examplesFinding)
  const d1d2Results = Array.make(proseResult, predicateResult, implementationResult, examplesResult)
  const d1d2 = Array.filterMap(d1d2Results, Function.identity)
  const demonstrated = demonstratedSet(definition)
  const toD3 = d3Finding(find)(demonstrated)
  const d3 = Array.filterMap(definition.enumeratedItems, toD3)
  const contraryDemonstrated = contraryDemonstratedSet(definition)
  const toD4 = d4ContraryFinding(find)(contraryDemonstrated)
  const d4Contraries = Array.filterMap(definition.contraries, toD4)
  const hasNotThis = Array.some(definition.examples, isNotThisExample)
  const hasThis = Array.some(definition.examples, isThisExample)
  const pairAgree = valuesEqual(hasNotThis)(hasThis)
  const pairDisagree = !pairAgree
  const pairFinding = find("D4")('"This" and "Not this" examples must be paired.')
  const pairResult = keepFinding(pairDisagree)(pairFinding)
  const d4Pair = findingsFromResult(pairResult)
  const relatedCount = definition.relatedTerms.length
  const hasRelated = !isZero(relatedCount)
  const comparisonCount = definition.comparisonExamples.length
  const missingComparison = isZero(comparisonCount)
  const needsComparison = hasRelated && missingComparison
  const comparisonFinding = find("D5")("A related-terms table requires a comparison example.")
  const comparisonResult = keepFinding(needsComparison)(comparisonFinding)
  const d5 = findingsFromResult(comparisonResult)
  const booleanPresent = hasBooleanMembership(definition.mechanicalPredicate)
  const booleanMissing = !booleanPresent

  const booleanFinding = find("D9")(
    "The mechanical predicate must state its Boolean membership result."
  )

  const booleanResult = keepFinding(booleanMissing)(booleanFinding)
  const d9 = findingsFromResult(booleanResult)
  const exportPresent = hasExportKeyword(definition.predicateImplementation)
  const exportMissing = !exportPresent
  const exportFinding = find("D10")("The predicate implementation must export its classifier.")
  const exportResult = keepFinding(exportMissing)(exportFinding)
  const d10 = findingsFromResult(exportResult)

  return pipe(
    d1d2,
    Array.appendAll(d3),
    Array.appendAll(d4Contraries),
    Array.appendAll(d4Pair),
    Array.appendAll(d5),
    Array.appendAll(d9),
    Array.appendAll(d10)
  )
}

// DuplicateState tracks first-seen term indexes because D6 findings name the later copy.
class DuplicateState extends Data.Class<{
  readonly seen: HashMap.HashMap<string, number>
  readonly findings: ReadonlyArray<Finding>
}> {}

const emptySeenIndexes = HashMap.empty<string, number>()

const emptyDuplicateState = new DuplicateState({
  seen: emptySeenIndexes,
  findings: emptyFindings
})

const makeDuplicateState = (state: DuplicateState, definition: Definition, index: number) => {
  const key = foldCase(definition.term)
  const firstOption = HashMap.get(state.seen, key)

  if (Option.isNone(firstOption)) {
    const seen = HashMap.set(state.seen, key, index)

    return new DuplicateState({ seen, findings: state.findings })
  }

  const first = firstOption.value
  const message = `Term duplicates the entry at position ${first}.`
  const unit = definitionUnit(index)
  const finding = makeFinding(unit)(definition.term)("D6")(message)
  const findings = Array.append(state.findings, finding)

  return new DuplicateState({ seen: state.seen, findings })
}

const duplicateFindings = (definitions: ReadonlyArray<Definition>) => {
  const state = Array.reduce(definitions, emptyDuplicateState, makeDuplicateState)

  return state.findings
}

const termPosition = (definition: Definition, index: number) => {
  const key = foldCase(definition.term)

  return Tuple.make(key, index)
}

const mapTermPositions = Array.map(termPosition)

const positionMap = flow(mapTermPositions, HashMap.fromIterable)

const equalsFolded = (left: string) => (right: string) => {
  const foldedLeft = foldCase(left)
  const foldedRight = foldCase(right)

  return valuesEqual(foldedLeft)(foldedRight)
}

const dependsOnTerm = (term: string) => (definition: Definition) => {
  const matches = equalsFolded(term)

  return Array.some(definition.dependsOn, matches)
}

const d7Finding = (term: string) => (definition: Definition, index: number) => {
  const depends = dependsOnTerm(term)(definition)

  if (!depends) {
    return Result.failVoid
  }

  const unit = definitionUnit(index)
  const message = `Referenced term ${JSON.stringify(term)} has no entry; rely only on the listed terms or ordinary language.`
  const finding = makeFinding(unit)(definition.term)("D7")(message)

  return Result.succeed(finding)
}

const findingsForUnknown = (definitions: ReadonlyArray<Definition>) => (term: string) => {
  const toFinding = d7Finding(term)

  return Array.filterMap(definitions, toFinding)
}

const unknownReferenceFindings =
  (definitions: ReadonlyArray<Definition>) => (unknownReferences: ReadonlyArray<string>) => {
    const toFindings = findingsForUnknown(definitions)

    return Array.flatMap(unknownReferences, toFindings)
  }

const d8Finding =
  (positions: HashMap.HashMap<string, number>) =>
  (cycle: ReadonlyArray<string>) =>
  (term: string) => {
    const key = foldCase(term)
    const indexOption = HashMap.get(positions, key)

    if (Option.isNone(indexOption)) {
      return Result.failVoid
    }

    const index = indexOption.value
    const unit = definitionUnit(index)
    const path = Array.join(cycle, cycleArrow)
    const message = `Terms reference each other cyclically (${path}); this entry must rely only on terms that can precede it.`
    const finding = makeFinding(unit)(term)("D8")(message)

    return Result.succeed(finding)
  }

const findingsForCycle =
  (positions: HashMap.HashMap<string, number>) => (cycle: ReadonlyArray<string>) => {
    const toFinding = d8Finding(positions)(cycle)

    return Array.filterMap(cycle, toFinding)
  }

const cycleFindings =
  (definitions: ReadonlyArray<Definition>) => (cycles: ReadonlyArray<ReadonlyArray<string>>) => {
    const positions = positionMap(definitions)
    const toFindings = findingsForCycle(positions)

    return Array.flatMap(cycles, toFindings)
  }

const definitionFindings = (ordering: Ordering) => (definitions: ReadonlyArray<Definition>) => {
  const perEntry = Array.flatMap(definitions, oneDefinitionFindings)
  const duplicates = duplicateFindings(definitions)
  const unknowns = unknownReferenceFindings(definitions)(ordering.unknownReferences)
  const cycles = cycleFindings(definitions)(ordering.cycles)

  return pipe(
    perEntry,
    Array.appendAll(duplicates),
    Array.appendAll(unknowns),
    Array.appendAll(cycles)
  )
}

const requiredFieldPairs = (constraint: Constraint) => {
  const statement = Tuple.make("statement", constraint.statement)
  const propertyProtected = Tuple.make("propertyProtected", constraint.propertyProtected)
  const rationale = Tuple.make("rationale", constraint.rationale)
  const verification = Tuple.make("verification", constraint.verification)

  const verificationImplementation = Tuple.make(
    "verificationImplementation",
    constraint.verificationImplementation
  )

  const allowedExample = Tuple.make("allowedExample", constraint.allowedExample)
  const violatingExample = Tuple.make("violatingExample", constraint.violatingExample)

  return Array.make(
    statement,
    propertyProtected,
    rationale,
    verification,
    verificationImplementation,
    allowedExample,
    violatingExample
  )
}

const emptyFieldFinding =
  (find: (code: string) => (message: string) => Finding) => (pair: readonly [string, string]) => {
    const field = Tuple.get(pair, 0)
    const value = Tuple.get(pair, 1)
    const empty = isEmptyText(value)

    if (!empty) {
      return Result.failVoid
    }

    const message = `Field ${field} is empty.`
    const finding = find("C2")(message)

    return Result.succeed(finding)
  }

const statementHasHatch = (statement: string) => (hatch: string) => {
  const lower = foldCase(statement)

  return lower.includes(hatch)
}

const escapeHatchFinding =
  (find: (code: string) => (message: string) => Finding) =>
  (statement: string) =>
  (hatch: string) => {
    const present = statementHasHatch(statement)(hatch)

    if (!present) {
      return Result.failVoid
    }

    const message = `The statement contains the escape hatch ${JSON.stringify(hatch)}.`
    const finding = find("C7")(message)

    return Result.succeed(finding)
  }

const unknownClassFinding =
  (find: (code: string) => (message: string) => Finding) =>
  (known: HashSet.HashSet<string>) =>
  (id: string) => {
    const present = HashSet.has(known, id)

    if (present) {
      return Result.failVoid
    }

    const message = `Unknown violation class ${JSON.stringify(id)}.`
    const finding = find("C5")(message)

    return Result.succeed(finding)
  }

const oneConstraintFindings =
  (known: HashSet.HashSet<string>) => (constraint: Constraint, index: number) => {
    const unit = constraintUnit(index)
    const heading = titleOf(constraint)
    const find = makeFinding(unit)(heading)
    const statement = constraint.statement
    const missingKeyword = !hasRfc2119(statement)
    const keywordFinding = find("C1")("The normative statement uses no RFC 2119 keyword.")
    const keywordResult = keepFinding(missingKeyword)(keywordFinding)
    const c1 = findingsFromResult(keywordResult)
    const fields = requiredFieldPairs(constraint)
    const toEmptyField = emptyFieldFinding(find)
    const c2 = Array.filterMap(fields, toEmptyField)
    const toHatch = escapeHatchFinding(find)(statement)
    const c7 = Array.filterMap(escapeHatches, toHatch)
    const allowed = constraint.allowedExample.trim()
    const violating = constraint.violatingExample.trim()
    const identicalExamples = valuesEqual(allowed)(violating)
    const identicalFinding = find("C6")("The allowed and violating examples are identical.")
    const identicalResult = keepFinding(identicalExamples)(identicalFinding)
    const c6 = findingsFromResult(identicalResult)
    const classIds = claimedIdsOf(constraint)
    const claimsNone = isZero(classIds.length)

    const noneFinding = find("C4")(
      "The rule claims no violation class, so it is not necessary for any."
    )

    const noneResult = keepFinding(claimsNone)(noneFinding)
    const c4 = findingsFromResult(noneResult)
    const toUnknown = unknownClassFinding(find)(known)
    const c5 = Array.filterMap(classIds, toUnknown)

    return pipe(
      c1,
      Array.appendAll(c2),
      Array.appendAll(c7),
      Array.appendAll(c6),
      Array.appendAll(c4),
      Array.appendAll(c5)
    )
  }

const unclaimedFinding = (violation: ViolationClass) => {
  const id = classIdOf(violation)
  const summary = summaryOf(violation)
  const message = `Violation class ${JSON.stringify(id)} (${summary}) is prevented by no rule.`

  return makeDocumentFinding(constraintsHeading)("C4")(message)
}

const unclaimedClassFinding = (claimed: HashSet.HashSet<string>) => (violation: ViolationClass) => {
  const id = classIdOf(violation)
  const isClaimed = HashSet.has(claimed, id)
  const finding = unclaimedFinding(violation)

  return isClaimed ? Result.failVoid : Result.succeed(finding)
}

const constraintFindings =
  (violationClasses: ReadonlyArray<ViolationClass>) => (constraints: ReadonlyArray<Constraint>) => {
    const knownIds = Array.map(violationClasses, classIdOf)
    const known = HashSet.fromIterable(knownIds)
    const claimedIds = Array.flatMap(constraints, claimedIdsOf)
    const claimed = HashSet.fromIterable(claimedIds)
    const toEntryFindings = oneConstraintFindings(known)
    const perRule = Array.flatMap(constraints, toEntryFindings)
    const toUnclaimed = unclaimedClassFinding(claimed)
    const unclaimed = Array.filterMap(violationClasses, toUnclaimed)

    return Array.appendAll(perRule, unclaimed)
  }

// LinkWalk carries the active glossary entry because L2 findings address that unit.
class LinkWalk extends Data.Class<{
  readonly entry: Option.Option<string>
  readonly findings: ReadonlyArray<Finding>
}> {}

const noEntry = Option.none<string>()

const emptyLinkWalk = new LinkWalk({
  entry: noEntry,
  findings: emptyFindings
})

const matchH3 = (line: string) => {
  const rawMatch = line.match(h3HeadingPattern)
  const matched = Option.fromNullishOr(rawMatch)

  if (Option.isNone(matched)) {
    return noEntry
  }

  const groups = Array.fromIterable(matched.value)

  return Array.get(groups, 1)
}

const isHeadingLine = (line: string) => anyHeadingPattern.test(line)

const isBlankLine = flow((line: string) => line.trim(), isEmptyString)

const documentAddress = Tuple.make(documentUnit, constraintsHeading)

const linkAddress =
  (positions: HashMap.HashMap<string, number>) => (entry: Option.Option<string>) => {
    if (Option.isNone(entry)) {
      return documentAddress
    }

    const heading = entry.value
    const key = foldCase(heading)
    const indexOption = HashMap.get(positions, key)

    if (Option.isNone(indexOption)) {
      return documentAddress
    }

    const index = indexOption.value
    const unit = definitionUnit(index)

    return Tuple.make(unit, heading)
  }

const l2Finding =
  (positions: HashMap.HashMap<string, number>) =>
  (entry: Option.Option<string>) =>
  (term: string) => {
    const address = linkAddress(positions)(entry)
    const unit = Tuple.get(address, 0)
    const heading = Tuple.get(address, 1)
    const message = `Term ${JSON.stringify(term)} is used without a link to its entry.`

    return makeFinding(unit)(heading)("L2")(message)
  }

const walkLinkLine =
  (anchors: HashMap.HashMap<string, string>, positions: HashMap.HashMap<string, number>) =>
  (state: LinkWalk, line: string) => {
    const headingOption = matchH3(line)

    if (Option.isSome(headingOption)) {
      const heading = headingOption.value
      const key = foldCase(heading)
      const isEntry = HashMap.has(positions, key)
      const entry = isEntry ? Option.some(heading) : noEntry

      return new LinkWalk({ entry, findings: state.findings })
    }

    const headingLine = isHeadingLine(line)
    const blankLine = isBlankLine(line)
    const skip = headingLine || blankLine

    if (skip) {
      return state
    }

    const termsForLine = unlinkedTerms(anchors, state.entry)
    const terms = termsForLine(line)
    const toFinding = l2Finding(positions)(state.entry)
    const more = Array.map(terms, toFinding)
    const findings = Array.appendAll(state.findings, more)

    return new LinkWalk({ entry: state.entry, findings })
  }

const afterDefinitionsText = (markdown: string) => {
  const stripped = stripFences(markdown)
  const parts = splitDefinitions(stripped)
  const afterParts = Array.drop(parts, 1)

  return Array.join(afterParts, newline)
}

const linkFindings = (markdown: string) => (document: ConstraintDocument) => {
  const terms = Array.map(document.definitions, termOf)
  const anchors = termAnchors(terms)
  const positions = positionMap(document.definitions)
  const afterInformal = afterDefinitionsText(markdown)
  const lines = afterInformal.split(newline)
  const walkLine = walkLinkLine(anchors, positions)
  const finalState = Array.reduce(lines, emptyLinkWalk, walkLine)

  return finalState.findings
}

export const auditDocument = (
  document: ConstraintDocument,
  markdown: string,
  ordering: Ordering,
  violationClasses: ReadonlyArray<ViolationClass>
) => {
  const fromDocument = documentFindings(markdown)(document)
  const fromDefinitions = definitionFindings(ordering)(document.definitions)
  const fromConstraints = constraintFindings(violationClasses)(document.constraints)
  const fromLinks = linkFindings(markdown)(document)

  return pipe(
    fromDocument,
    Array.appendAll(fromDefinitions),
    Array.appendAll(fromConstraints),
    Array.appendAll(fromLinks)
  )
}
