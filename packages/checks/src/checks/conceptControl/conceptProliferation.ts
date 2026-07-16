import {
  Array,
  Function,
  HashMap,
  HashSet,
  Option,
  Record,
  Schema,
  Struct,
  Tuple,
  pipe,
  Result
} from "effect"
import { Advice } from "@better-typescript/core/engine/derive/data"
import {
  adviceLocation,
  deriveSignals,
  evidenceFromCounts,
  evidenceItem
} from "@better-typescript/core/engine/derive"
import type { Detection } from "@better-typescript/core/engine/location/data"
import { packageExamples } from "../../defineCheck.js"
import { ConceptSignalData, type ConceptSignalKind } from "./data.js"

export const closedAbstractionClusterExamples = packageExamples("concept-control")

export const conceptProliferationExamples = packageExamples("concept-proliferation")

const proliferationKinds = HashSet.make<ConceptSignalKind[]>(
  "duplicate-shape",
  "function-derived-model",
  "parameter-bag",
  "pass-through-conversion",
  "redundant-alias",
  "speculative-export",
  "unused-field"
)

const immediateDirectory = (filePath: string): string => {
  const normalized = filePath.replaceAll("\\", "/")
  const segments = normalized.split("/")
  const parents = Array.dropRight(segments, 1)

  return Array.join(parents, "/") || "."
}

const signalData = (element: Detection): Option.Option<ConceptSignalData> =>
  pipe(element.data, Option.fromNullishOr, Option.filter(Schema.is(ConceptSignalData)))

const signalKindCount = (
  counts: HashMap.HashMap<string, number>,
  data: ConceptSignalData
): HashMap.HashMap<string, number> => {
  const current = pipe(HashMap.get(counts, data.kind), Option.getOrElse(Function.constant(0)))

  return HashMap.set(counts, data.kind, current + 1)
}

const closedAbstractionAdvice = (element: Detection, data: ConceptSignalData): Advice => {
  const externalCallers = evidenceItem("external callers", data.externalCallers)
  const independentOwners = evidenceItem("independent model owners", data.independentOwners)
  const evidence = Array.make(externalCallers, independentOwners)
  const examples = closedAbstractionClusterExamples()

  return new Advice({
    location: element.location,
    level: "file",
    title: "closed abstraction cluster",
    remediation:
      `${data.concept} and ${data.owner} only justify one another. Delete or merge the ` +
      "function, reuse existing domain concepts, or deepen the Module until it owns an " +
      "independent seam, invariant, protocol, or multiple consumers. Never evade this by " +
      "replacing the model with an anonymous object type.",
    evidence,
    examples
  })
}

const proliferationAdvice = (
  directory: string,
  elements: ReadonlyArray<Detection>
): Option.Option<Advice> => {
  const data = Array.filterMap(
    elements,
    Function.flow(signalData, Result.fromOption(Function.constVoid))
  )

  const concepts = pipe(
    data,
    Array.flatMap((item) => Array.prepend(item.relatedConcepts, item.concept)),
    HashSet.fromIterable
  )

  const enoughSignals = data.length >= 2
  const enoughConcepts = HashSet.size(concepts) >= 2
  const conditions = Array.make(enoughSignals, enoughConcepts)

  if (!Array.every(conditions, Boolean)) {
    return Option.none()
  }

  const emptyKindCounts = HashMap.empty<string, number>()
  const kindCounts = Array.reduce(data, emptyKindCounts, signalKindCount)
  const counts = evidenceFromCounts(kindCounts)
  const distinctConceptCount = HashSet.size(concepts)
  const conceptCount = evidenceItem("distinct concepts", distinctConceptCount)
  const signalCount = evidenceItem("concept-control signals", data.length)
  const withSignals = Array.prepend(counts, signalCount)
  const evidence = Array.prepend(withSignals, conceptCount)
  const location = adviceLocation(directory)
  const examples = conceptProliferationExamples()

  const advice = new Advice({
    location,
    level: "directory",
    title: "concept proliferation",
    remediation:
      "Several weakly justified representations accumulate in this concept directory. " +
      "Review them as one vocabulary: delete speculative fields and exports, reuse or merge " +
      "equivalent shapes, collapse pass-through conversions, then deepen the remaining " +
      "Module behind fewer enduring models. File separation does not make these independent concepts.",
    evidence,
    examples
  })

  return Option.some(advice)
}

const conceptAdviceFor = (elements: ReadonlyArray<Detection>): ReadonlyArray<Advice> => {
  const typed = Array.filterMap(elements, (element) =>
    pipe(
      signalData(element),
      Option.map((data) => Tuple.make(element, data)),
      Result.fromOption(Function.constVoid)
    )
  )

  const closed = pipe(
    typed,
    Array.filter((entry) => entry[1].kind === "closed-abstraction"),
    Array.map((entry) => closedAbstractionAdvice(entry[0], entry[1]))
  )

  const proliferationElements = pipe(
    typed,
    Array.filter((entry) => HashSet.has(proliferationKinds, entry[1].kind)),
    Array.map(Struct.get(0))
  )

  const byDirectory = Array.groupBy(proliferationElements, (element) =>
    immediateDirectory(element.location.path)
  )

  const proliferation = pipe(
    Record.toEntries(byDirectory),
    Array.filterMap(([directory, grouped]) => {
      const advice = proliferationAdvice(directory, grouped)

      return Result.fromOption(advice, Function.constVoid)
    })
  )

  return Array.appendAll(closed, proliferation)
}

export const conceptProliferation = deriveSignals(conceptAdviceFor)
