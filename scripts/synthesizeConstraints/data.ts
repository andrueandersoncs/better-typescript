import { Array, Data, Schema } from "effect"

const fenceLanguageNames = Array.make<["ts", "tsx", "jsonc", "json"]>("ts", "tsx", "jsonc", "json")

// FenceLanguage is the fence dialect because only dialects a checker decides may enter a document.
export const FenceLanguage = Schema.Literals(fenceLanguageNames)

export type FenceLanguage = typeof FenceLanguage.Type

const exampleLabelNames = Array.make<["plain", "this", "notThis"]>("plain", "this", "notThis")

// ExampleLabel is the rendered example label because the audit pairs "this" against "notThis".
export const ExampleLabel = Schema.Literals(exampleLabelNames)

export type ExampleLabel = typeof ExampleLabel.Type

const effortNames = Array.make<["lo", "med", "hi"]>("lo", "med", "hi")

// Effort is the thinking budget because the cache key must change when the budget changes.
export const Effort = Schema.Literals(effortNames)

export type Effort = typeof Effort.Type

const stringArray = Schema.Array(Schema.String)

const exampleFields = {
  label: ExampleLabel.annotate({
    description:
      'Use "this" and "notThis" as a pair when the example demonstrates a contrary case; otherwise "plain".'
  }),
  language: FenceLanguage,
  demonstrates: stringArray.annotate({
    description:
      "The enumerated definition items this snippet demonstrates, named exactly as the definition enumerates them."
  }),
  code: Schema.String.annotate({
    description:
      "A complete, independently type-checkable snippet whose comments sit adjacent to the exact declaration each names."
  })
}

// Example is a fence plus the items it demonstrates because coverage joins fences to those items.
export const Example = Schema.Struct(exampleFields)

export interface Example extends Schema.Schema.Type<typeof Example> {}

const exampleArray = Schema.Array(Example)

const relatedTermFields = {
  term: Schema.String.annotate({
    description: "The synonym, near-synonym, or easily-confused neighbouring concept."
  }),
  relation: Schema.String.annotate({ description: "How it relates to the defined term." }),
  decidingDistinction: Schema.String.annotate({
    description: "The observable distinction that decides between them."
  }),
  whyNotInterchangeable: Schema.String.annotate({
    description:
      "Why the defined term, not this alternative, is required where a later constraint relies on it."
  })
}

// RelatedTerm is one comparison row because a definition must say why a neighbour is not it.
export const RelatedTerm = Schema.Struct(relatedTermFields)

export interface RelatedTerm extends Schema.Schema.Type<typeof RelatedTerm> {}

const relatedTermArray = Schema.Array(RelatedTerm)

// definitionDraftFields is the drafted half of an entry because one field list must serve both.
const definitionDraftFields = {
  prose: Schema.String.annotate({
    description:
      "The definition. Identify observable boundaries, not identifier names, directory names, or presumed intent. Use only already-defined terms or ordinary language. Write the term plainly; links are added mechanically."
  }),
  dependsOn: stringArray.annotate({ description: "Defined terms this prose relies on." }),
  enumeratedItems: stringArray.annotate({
    description:
      "Every item this prose enumerates: each observable input, each membership requirement, each alternative in an 'or' or 'and' list, and each named category or facility."
  }),
  contraries: stringArray.annotate({
    description:
      "Every contrary, inverse, exclusion, or prohibition this prose names, including each item introduced by 'rather than', 'not', 'does not', or 'except'."
  }),
  relatedTerms: relatedTermArray.annotate({
    description: "Leave empty when no plausible related concept exists; never invent a distinction."
  }),
  comparisonExamples: exampleArray.annotate({
    description:
      "Exactly one entry when relatedTerms is non-empty, comparing the defined term against every related term with adjacent comments; otherwise empty."
  }),
  mechanicalPredicate: Schema.String.annotate({
    description:
      "The classifier every later verification uses: its required inputs, its deterministic procedure, and its Boolean membership result for one concrete artifact or relationship. Decide it without human judgement."
  }),
  predicateImplementation: Schema.String.annotate({
    description:
      "TypeScript implementing that predicate against its stated imports. Export the classifier. No pseudocode."
  }),
  examples: exampleArray.annotate({
    description:
      "One labelled example per enumerated item, and a paired 'this'/'notThis' set for every contrary."
  })
}

// Definition is the glossary entry because ordering, rendering, and auditing read one contract.
export const Definition = Schema.Struct({ term: Schema.String, ...definitionDraftFields })

export interface Definition extends Schema.Schema.Type<typeof Definition> {}

// DefinitionDraft omits the term because an entry must never redefine a term it was not asked for.
export const DefinitionDraft = Schema.Struct(definitionDraftFields)

export interface DefinitionDraft extends Schema.Schema.Type<typeof DefinitionDraft> {}

// constraintDraftFields is the drafted half of a rule because one field list must serve both.
const constraintDraftFields = {
  statement: Schema.String.annotate({
    description:
      "The normative statement. Name the subject, the required or prohibited condition, any ordering or ownership fact, and the verification it requires. Use MUST when violation prevents the concept, SHOULD only for a real trade-off, MAY only for a permitted alternative. Write terms plainly; links are added mechanically."
  }),
  propertyProtected: Schema.String.annotate({
    description:
      "The exact property this rule establishes and every observable problem or violation class it remediates, distinguished from one another."
  }),
  rationale: Schema.String.annotate({
    description:
      "Why this exact condition is necessary for that property and how it prevents each named violation class. Do not restate the rule. Where the rule relies on a term with related terms, say why the alternatives are not interchangeable."
  }),
  verification: Schema.String.annotate({
    description:
      "The required inputs, deterministic procedure, success criterion, and failure finding."
  }),
  verificationImplementation: Schema.String.annotate({
    description:
      "TypeScript implementing that verifier's inputs, traversal, classification, test, and finding, against its stated imports. No pseudocode."
  }),
  allowedExample: Schema.String.annotate({
    description: "A close, complete TypeScript example this rule allows."
  }),
  violatingExample: Schema.String.annotate({
    description:
      "A close, complete TypeScript example this rule rejects, differing from the allowed example only in what the rule governs."
  })
}

// Constraint is one numbered rule because rendering and coverage auditing read one contract.
export const Constraint = Schema.Struct({
  title: Schema.String,
  violationClassIds: stringArray,
  ...constraintDraftFields
})

export interface Constraint extends Schema.Schema.Type<typeof Constraint> {}

// ConstraintDraft omits the plan's fields because a rule must not choose the classes it covers.
export const ConstraintDraft = Schema.Struct(constraintDraftFields)

export interface ConstraintDraft extends Schema.Schema.Type<typeof ConstraintDraft> {}

const violationClassFields = {
  id: Schema.String.annotate({
    description: "A stable lower-kebab identifier, unique across the enumeration."
  }),
  summary: Schema.String.annotate({
    description: "The failure, stated as what an artifact does rather than what it lacks."
  }),
  technology: Schema.String.annotate({
    description: "The technology whose surface permits this failure."
  }),
  observable: Schema.String.annotate({
    description:
      "The mechanically observable evidence that this failure occurred: an AST shape, a resolved type, a graph property, a file path, or a runtime trace."
  })
}

// ViolationClass is one observable failure because coverage joins rules to failures by its id.
export const ViolationClass = Schema.Struct(violationClassFields)

export interface ViolationClass extends Schema.Schema.Type<typeof ViolationClass> {}

const violationClassArray = Schema.Array(ViolationClass)

const technologyFields = {
  name: Schema.String.annotate({
    description: "The technology exactly as the request names it."
  }),
  surfaces: stringArray.annotate({
    description:
      "Every facility, type-system feature, configuration surface, lifecycle, boundary, and composition mechanism of this technology that can affect the requested quality."
  })
}

// Technology is a named surface inventory because later stages must exhaust what it lists.
export const Technology = Schema.Struct(technologyFields)

export interface Technology extends Schema.Schema.Type<typeof Technology> {}

const technologyArray = Schema.Array(Technology)

const termFields = {
  name: Schema.String.annotate({ description: "The term, in sentence case." }),
  why: Schema.String.annotate({
    description: "What a reader could not decide if this term were left undefined."
  }),
  dependsOn: stringArray.annotate({
    description: "Other terms in this inventory whose meaning this term's definition will rely on."
  })
}

// Term is one inventoried term because the glossary order is a function of the edges it declares.
export const Term = Schema.Struct(termFields)

export interface Term extends Schema.Schema.Type<typeof Term> {}

const termArray = Schema.Array(Term)

const constraintSlotFields = {
  title: Schema.String.annotate({
    description: "A short noun phrase naming the rule's subject."
  }),
  violationClassIds: stringArray.annotate({
    description:
      "The violation class ids this rule rejects. Every id must be claimed by some rule, and each rule must be the smallest rule that rejects the ids it claims."
  })
}

// ConstraintSlot is a planned rule because drafting and coverage both read the plan's assignment.
export const ConstraintSlot = Schema.Struct(constraintSlotFields)

export interface ConstraintSlot extends Schema.Schema.Type<typeof ConstraintSlot> {}

const constraintSlotArray = Schema.Array(ConstraintSlot)

const technologyInventoryFields = {
  technologies: technologyArray.annotate({
    description: "One entry per technology explicitly named by the request, plus TypeScript itself."
  })
}

// TechnologyInventory wraps the surfaces because a structured-output root must be an object.
export const TechnologyInventory = Schema.Struct(technologyInventoryFields)

export interface TechnologyInventory extends Schema.Schema.Type<typeof TechnologyInventory> {}

const violationEnumerationFields = {
  violations: violationClassArray.annotate({
    description:
      "One entry per independently observable way the requested quality can fail, across every technology surface and their interactions."
  })
}

// ViolationEnumeration wraps the failures because a structured-output root must be an object.
export const ViolationEnumeration = Schema.Struct(violationEnumerationFields)

export interface ViolationEnumeration extends Schema.Schema.Type<typeof ViolationEnumeration> {}

const termInventoryFields = {
  informalDefinition: Schema.String.annotate({
    description:
      "One to three paragraphs of ordinary technical language: the property the project has when the concept is true, what it excludes, and how constraints collectively establish it. State no requirement, no predicate, no code, and no formal term."
  }),
  terms: termArray.annotate({
    description:
      "Every technical term, category, classification, action, state, boundary, and relationship the constraints will rely on."
  })
}

// TermInventory pairs the orienting prose with its vocabulary because one stage decides both.
export const TermInventory = Schema.Struct(termInventoryFields)

export interface TermInventory extends Schema.Schema.Type<typeof TermInventory> {}

const constraintPlanFields = {
  constraints: constraintSlotArray.annotate({
    description:
      "One entry per rule. Split a rule whenever a single statement would cover unrelated failures."
  })
}

// ConstraintPlan is the rule-to-failure assignment because replanning replaces it as one value.
export const ConstraintPlan = Schema.Struct(constraintPlanFields)

export interface ConstraintPlan extends Schema.Schema.Type<typeof ConstraintPlan> {}

const definitionArray = Schema.Array(Definition)
const constraintArray = Schema.Array(Constraint)

// ConstraintDocument is the renderable document because rendering and auditing read one value.
export const ConstraintDocument = Schema.Struct({
  title: Schema.String,
  informalDefinition: Schema.String,
  definitions: definitionArray,
  constraints: constraintArray
})

export interface ConstraintDocument extends Schema.Schema.Type<typeof ConstraintDocument> {}

// Finding is one failed obligation because every audit, compiler, and stage failure routes alike.
export const Finding = Schema.Struct({
  code: Schema.String,
  unit: Schema.String,
  heading: Schema.String,
  message: Schema.String
})

export interface Finding extends Schema.Schema.Type<typeof Finding> {}

const findingArray = Schema.Array(Finding)

const cycleArray = Schema.Array(stringArray)

// Ordering is the sequenced glossary with its defects because the audit reports what blocked it.
export const Ordering = Schema.Struct({
  definitions: definitionArray,
  cycles: cycleArray,
  unknownReferences: stringArray
})

export interface Ordering extends Schema.Schema.Type<typeof Ordering> {}

// Concept is the resolved request because no later stage may reinterpret the command argument.
export const Concept = Schema.Struct({
  name: Schema.String,
  title: Schema.String,
  slug: Schema.String,
  request: Schema.String,
  outputPath: Schema.String
})

export interface Concept extends Schema.Schema.Type<typeof Concept> {}

const fenceOwnerKinds = Array.make<["definition", "constraint"]>("definition", "constraint")

// FenceOwnerKind names the section a fence belongs to because repair routes findings by section.
export const FenceOwnerKind = Schema.Literals(fenceOwnerKinds)

export type FenceOwnerKind = typeof FenceOwnerKind.Type

// CodeFence is one addressable snippet because a diagnostic must name the entry that produced it.
export const CodeFence = Schema.Struct({
  id: Schema.String,
  kind: FenceOwnerKind,
  index: Schema.Number,
  heading: Schema.String,
  field: Schema.String,
  language: FenceLanguage,
  code: Schema.String
})

export interface CodeFence extends Schema.Schema.Type<typeof CodeFence> {}

// RunOptions is the whole invocation because the pipeline and the stage client read the same knobs.
export const RunOptions = Schema.Struct({
  concept: Schema.String,
  outputDirectory: Schema.String,
  cacheDirectory: Schema.String,
  model: Schema.String,
  effort: Effort,
  attempts: Schema.Number,
  concurrency: Schema.Number,
  refresh: Schema.Boolean,
  maxRuntimeMs: Schema.Number,
  workerPath: Schema.String,
  workingDirectory: Schema.String
})

export interface RunOptions extends Schema.Schema.Type<typeof RunOptions> {}

// StageOutcome is a settled generation because the cache stores exactly what a stage produced.
export const StageOutcome = Schema.Struct({
  data: Schema.Unknown,
  requests: Schema.Number,
  tokens: Schema.Number
})

export interface StageOutcome extends Schema.Schema.Type<typeof StageOutcome> {}

// StageRecord is one stage's provenance because the manifest must replay or explain a run.
export const StageRecord = Schema.Struct({
  stage: Schema.String,
  cacheKey: Schema.String,
  cached: Schema.Boolean,
  requests: Schema.Number,
  tokens: Schema.Number
})

export interface StageRecord extends Schema.Schema.Type<typeof StageRecord> {}

// StageRequest is the wire assignment because the client and the Bun worker share one protocol.
export const StageRequest = Schema.Struct({
  id: Schema.String,
  stage: Schema.String,
  systemPrompt: Schema.String,
  tools: stringArray,
  jsonSchema: Schema.Unknown,
  task: Schema.String,
  model: Schema.String,
  effort: Effort,
  maxRuntimeMs: Schema.Number,
  workingDirectory: Schema.String
})

export interface StageRequest extends Schema.Schema.Type<typeof StageRequest> {}

// WorkerReady announces a usable worker because the client must not dispatch before the SDK loads.
export const WorkerReady = Schema.TaggedStruct("WorkerReady", {})

export interface WorkerReady extends Schema.Schema.Type<typeof WorkerReady> {}

// StageSucceeded carries the payload because provenance and data settle in the same reply.
export const StageSucceeded = Schema.TaggedStruct("StageSucceeded", {
  id: Schema.String,
  outcome: StageOutcome
})

export interface StageSucceeded extends Schema.Schema.Type<typeof StageSucceeded> {}

// StageFailed carries one message because a failed stage becomes a finding rather than a crash.
export const StageFailed = Schema.TaggedStruct("StageFailed", {
  id: Schema.String,
  error: Schema.String
})

export interface StageFailed extends Schema.Schema.Type<typeof StageFailed> {}

const workerReplyMembers = Array.make(WorkerReady, StageSucceeded, StageFailed)

// WorkerReply is every line the worker writes because the client decodes one stream of replies.
export const WorkerReply = Schema.Union(workerReplyMembers)

export type WorkerReply = typeof WorkerReply.Type

// Repair is a correction round because a fresh agent cannot fix an artifact it has never seen.
export const Repair = Schema.Struct({
  findings: findingArray,
  previous: Schema.Unknown
})

export interface Repair extends Schema.Schema.Type<typeof Repair> {}

// StageSpec is one assignment because its bytes decide the cache key and the reply decode.
export class StageSpec<A> extends Data.Class<{
  readonly stage: string
  readonly systemPrompt: string
  readonly tools: ReadonlyArray<string>
  readonly schema: Schema.Codec<A>
  readonly task: string
}> {}

// ConceptArgumentError names a usage fault because a caller can act on a message, not a stack.
export class ConceptArgumentError extends Schema.TaggedErrorClass<ConceptArgumentError>()(
  "ConceptArgumentError",
  {
    message: Schema.String
  }
) {}

// DocumentReadError names a missing request document because the argument named a file.
export class DocumentReadError extends Schema.TaggedErrorClass<DocumentReadError>()(
  "DocumentReadError",
  {
    documentPath: Schema.String,
    message: Schema.String
  }
) {}

// ScratchDirectoryError names a scratch fault because it is a harness defect, not a document one.
export class ScratchDirectoryError extends Schema.TaggedErrorClass<ScratchDirectoryError>()(
  "ScratchDirectoryError",
  {
    message: Schema.String
  }
) {}

// StageError names a generation fault because the pipeline turns it into a routed finding.
export class StageError extends Schema.TaggedErrorClass<StageError>()("StageError", {
  stage: Schema.String,
  message: Schema.String
}) {}

// WorkerError names a worker-lifecycle fault because no stage can proceed once the worker is gone.
export class WorkerError extends Schema.TaggedErrorClass<WorkerError>()("WorkerError", {
  message: Schema.String
}) {}

// ManifestWriteError names an output fault because a run must not report success without output.
export class ManifestWriteError extends Schema.TaggedErrorClass<ManifestWriteError>()(
  "ManifestWriteError",
  {
    outputPath: Schema.String,
    message: Schema.String
  }
) {}

// PipelineError is every routed failure because one boundary reports them all as a message.
export type PipelineError =
  | ConceptArgumentError
  | DocumentReadError
  | ManifestWriteError
  | ScratchDirectoryError
  | StageError
  | WorkerError

// ManifestTotals is the run's aggregate cost because the manifest must state it without recounting.
export const ManifestTotals = Schema.Struct({
  stages: Schema.Number,
  generated: Schema.Number,
  requests: Schema.Number,
  tokens: Schema.Number
})

export interface ManifestTotals extends Schema.Schema.Type<typeof ManifestTotals> {}
