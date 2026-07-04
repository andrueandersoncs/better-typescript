import { Array, Match, Schema, Struct, pipe } from "effect"
import * as ts from "typescript"

// One matcher language over the whole containment tree: project, directory, file, finding, TypeScript AST node, and node properties. Terms are data; the evaluators are the interpreters (L0 compiles AST fragments into rule listeners, the summary evaluator folds finding fragments over the tree), and FindingOf lets any detector's sentence quantify over any other detector's findings (see adrs/0003-detectors-over-a-stratified-containment-tree.md).

// --- finding-level atoms (evaluated against the finding tree / Summary index) ---

// Counts the named detector's findings under the current node, whatever that detector's role or level: rules, signals, and advice are all consumable through the same atom.
export class FindingOf extends Schema.TaggedClass<FindingOf>()("FindingOf", {
  detectorId: Schema.String
}) {}

export class FindingWithFacet extends Schema.TaggedClass<FindingWithFacet>()(
  "FindingWithFacet",
  {
    detectorId: Schema.String,
    facet: Schema.String
  }
) {}

export class AnyFinding extends Schema.TaggedClass<AnyFinding>()(
  "AnyFinding",
  {}
) {}

// --- AST-level atoms (compiled into rule listeners by matcherRule) ---

const syntaxKindSchema = Schema.Enums(ts.SyntaxKind)

export class Kind extends Schema.TaggedClass<Kind>()("Kind", {
  kind: syntaxKindSchema
}) {}

export class TextIncludes extends Schema.TaggedClass<TextIncludes>()(
  "TextIncludes",
  {
    value: Schema.String
  }
) {}

export class TextEquals extends Schema.TaggedClass<TextEquals>()("TextEquals", {
  value: Schema.String
}) {}

// True at every node: the unit of And. Property(name, Anything) reads as bare presence of the property.
export class Anything extends Schema.TaggedClass<Anything>()("Anything", {}) {}

// --- aggregate atoms that read the Summary index directly ---

export class FilesWithFindings extends Schema.TaggedClass<FilesWithFindings>()(
  "FilesWithFindings",
  {
    minimum: Schema.Int
  }
) {}

// Lines where two or more distinct finding rules flag the same position; a candidate for decomposition once the tree grows line nodes.
export class CollidingLines extends Schema.TaggedClass<CollidingLines>()(
  "CollidingLines",
  {
    minimum: Schema.Int
  }
) {}

// Existential over rules: some rule holds at least numerator/denominator of the node's findings across at least minSpread files. Stays primitive until the language grows binders.
export class DominantRule extends Schema.TaggedClass<DominantRule>()(
  "DominantRule",
  {
    numerator: Schema.Int,
    denominator: Schema.Int,
    minSpread: Schema.Int
  }
) {}

// Pure observation: the per-rule finding counts, largest first. Never gates; use it in observe to carry the node's profile as evidence.
export class FindingBreakdown extends Schema.TaggedClass<FindingBreakdown>()(
  "FindingBreakdown",
  {}
) {}

// --- combinators: the language is closed under boolean operations and counting ---

export type Matcher =
  | FindingOf
  | FindingWithFacet
  | AnyFinding
  | Kind
  | TextIncludes
  | TextEquals
  | Anything
  | FilesWithFindings
  | CollidingLines
  | DominantRule
  | FindingBreakdown
  | And
  | Or
  | Not
  | AtLeast
  | ShareOfProject
  | Parent
  | Property

// Matchers are authored in code and never decoded from wire data, so the encoded side of the recursion carries no obligation; the cast keeps the recursive union readable.
const matcherField = Schema.suspend(
  (): Schema.Schema<Matcher, Matcher> =>
    matcherSchema as unknown as Schema.Schema<Matcher, Matcher>
)

const matcherListField = Schema.Array(matcherField)

export class And extends Schema.TaggedClass<And>()("And", {
  terms: matcherListField
}) {}

export class Or extends Schema.TaggedClass<Or>()("Or", {
  terms: matcherListField
}) {}

export class Not extends Schema.TaggedClass<Not>()("Not", {
  term: matcherField
}) {}

// Counts the entities under the current node that satisfy the term (matches at interpretation time, AST descendants at rule-compile time) and fires at the minimum.
export class AtLeast extends Schema.TaggedClass<AtLeast>()("AtLeast", {
  minimum: Schema.Int,
  term: matcherField
}) {}

// Fires when this node's count of term * denominator >= the project's count of term * numerator.
export class ShareOfProject extends Schema.TaggedClass<ShareOfProject>()(
  "ShareOfProject",
  {
    numerator: Schema.Int,
    denominator: Schema.Int,
    term: matcherField
  }
) {}

// --- structural navigation: the node-property axis of the containment tree ---

// Evaluated at the node's parent; the root has none and never satisfies.
export class Parent extends Schema.TaggedClass<Parent>()("Parent", {
  term: matcherField
}) {}

// Evaluated at the nodes stored under the named property — a single child node, or each element of a node array; a missing property never satisfies.
export class Property extends Schema.TaggedClass<Property>()("Property", {
  name: Schema.String,
  term: matcherField
}) {}

export const matcherSchema = Schema.Union(
  FindingOf,
  FindingWithFacet,
  AnyFinding,
  Kind,
  TextIncludes,
  TextEquals,
  Anything,
  FilesWithFindings,
  CollidingLines,
  DominantRule,
  FindingBreakdown,
  And,
  Or,
  Not,
  AtLeast,
  ShareOfProject,
  Parent,
  Property
)

const noMentions = (): ReadonlyArray<string> => []

type DetectorScopedMatcher = FindingOf | FindingWithFacet

const singleMention = (term: DetectorScopedMatcher): ReadonlyArray<string> => [
  term.detectorId
]

const nestedMentions = (term: And | Or): ReadonlyArray<string> =>
  term.terms.flatMap(matcherMentionsUnsafe)

const innerMentions = (
  term: Not | AtLeast | ShareOfProject | Parent | Property
): ReadonlyArray<string> => matcherMentionsUnsafe(term.term)

const matcherMentionsUnsafe = (matcher: Matcher): ReadonlyArray<string> =>
  pipe(
    Match.value(matcher),
    Match.tag("FindingOf", singleMention),
    Match.tag("FindingWithFacet", singleMention),
    Match.tag("And", nestedMentions),
    Match.tag("Or", nestedMentions),
    Match.tag("Not", innerMentions),
    Match.tag("AtLeast", innerMentions),
    Match.tag("ShareOfProject", innerMentions),
    Match.tag("Parent", innerMentions),
    Match.tag("Property", innerMentions),
    Match.orElse(noMentions)
  )

// Consumption is derived recursively from the terms, never declared: a matcher cannot claim to read a detector it does not mention, and cannot hide one it does. The mentions relation doubles as the dependency DAG the scheduler topologically sorts.
export const matcherMentions = (matcher: Matcher): ReadonlyArray<string> => {
  const mentions = matcherMentionsUnsafe(matcher)

  return Array.dedupe(mentions)
}

const joinedDescriptions = (terms: ReadonlyArray<Matcher>): string =>
  terms.map(describeMatcher).join(", ")

const describeAnd = (term: And): string =>
  `all(${joinedDescriptions(term.terms)})`

const describeOr = (term: Or): string =>
  `any(${joinedDescriptions(term.terms)})`

const describeNot = (term: Not): string => `not(${describeMatcher(term.term)})`

const describeParent = (term: Parent): string =>
  `parent(${describeMatcher(term.term)})`

const describeProperty = (term: Property): string =>
  `${term.name}(${describeMatcher(term.term)})`

const describeShare = (term: ShareOfProject): string =>
  `share(${describeMatcher(term.term)})`

const describeKind = (term: Kind): string => `kind ${ts.SyntaxKind[term.kind]}`

const mentionedDetectorId: (term: DetectorScopedMatcher) => string =
  Struct.get("detectorId")

// The measure label a term contributes to evidence: AtLeast is transparent so the trace names what was counted, not the threshold. One tagsExhaustive table instead of per-tag pipe steps: the union outgrew pipe's 20-argument overloads.
export const describeMatcher = (matcher: Matcher): string =>
  pipe(
    Match.value(matcher),
    Match.tagsExhaustive({
      FindingOf: mentionedDetectorId,
      FindingWithFacet: (term) => `${term.detectorId}/${term.facet}`,
      AnyFinding: () => "findings",
      Kind: describeKind,
      TextIncludes: (term) => `text ~ ${term.value}`,
      TextEquals: (term) => `text = ${term.value}`,
      Anything: () => "anything",
      FilesWithFindings: () => "files-with-findings",
      CollidingLines: () => "colliding-lines",
      DominantRule: () => "dominant-rule",
      FindingBreakdown: () => "finding-breakdown",
      And: describeAnd,
      Or: describeOr,
      Not: describeNot,
      AtLeast: (term) => describeMatcher(term.term),
      ShareOfProject: describeShare,
      Parent: describeParent,
      Property: describeProperty
    })
  )
