import {
  Array,
  Data,
  Function,
  Option,
  Order,
  Result,
  Schema,
  Struct,
  Tuple,
  flow,
  pipe
} from "effect"
import { strictEqual } from "@better-typescript/matchers/equivalence"
import { Advice } from "@better-typescript/core/engine/derive/advice"
import { EvidenceItem } from "@better-typescript/core/engine/derive/evidenceItem"
import { deriveSignals } from "@better-typescript/core/engine/derive/deriveSignals"
import { NamedDetection } from "@better-typescript/core/engine/derive/namedDetection"
import { Location } from "@better-typescript/core/engine/location/locationData"
import { makePackageExamples } from "../makePackageExamples.js"
import { SemanticModulePlacementData } from "@better-typescript/matchers/builtins/architectureExplore/semanticModuleEngine.js"
import type { SemanticModulePlacementEntityRecord as PlacementEntity } from "@better-typescript/matchers/builtins/architectureExplore/semanticModulePlacementEntityRecord.js"
import { MixedPhysicalModulePlacementData } from "@better-typescript/matchers/builtins/architectureExplore/semanticModulePlacementMixedData.js"
import type { SemanticModulePlacementModuleSlice as ModuleSlice } from "@better-typescript/matchers/builtins/architectureExplore/semanticModulePlacementModuleSlice.js"
import { SplitSemanticModulePlacementData } from "@better-typescript/matchers/builtins/architectureExplore/semanticModulePlacementSplitData.js"
import { semanticModulePlacementName as stableSemanticModulePlacementName } from "../preset/semanticModulePlacementPolicies.js"

const placementDeclarationKinds = {
  FunctionDeclaration: "function",
  ClassDeclaration: "class",
  InterfaceDeclaration: "interface",
  TypeAliasDeclaration: "type alias",
  EnumDeclaration: "enum",
  VariableDeclaration: "variable",
  ModuleDeclaration: "namespace"
} as const

const makeArchitectureExploreSemanticModulePlacementAdviser = () => {
  const deriveCheckedData = <A>(
    guard: (input: unknown) => input is A,
    element: NamedDetection
  ): Option.Option<A> =>
    guard(element.detection.data) ? Option.some(element.detection.data) : Option.none<A>()

  class PlacementElement extends Data.Class<{
    readonly namedDetection: NamedDetection
    readonly data: SemanticModulePlacementData
  }> {}

  const interleaveModules = (modules: ReadonlyArray<ModuleSlice>): ReadonlyArray<string> => {
    const moduleAnchorEntity = (module: ModuleSlice) =>
      pipe(module.entities, Array.head, Option.getOrThrow)

    const humanDeclarationKind = (kind: PlacementEntity["declarationKind"]): string =>
      placementDeclarationKinds[kind]

    const entityRow = (entity: PlacementEntity) =>
      `    - ${entity.displayName} — ${humanDeclarationKind(entity.declarationKind)} — ${entity.key.path}:${entity.line}:${entity.column}`

    const moduleAnchorLine = (module: ModuleSlice) => {
      const anchor = moduleAnchorEntity(module)

      return `  Semantic Module anchored at ${anchor.key.path}:${anchor.line}:${anchor.column}`
    }

    const moduleMembershipLines = (module: ModuleSlice) => {
      const rows = Array.map(module.entities, entityRow)
      const anchorLine = moduleAnchorLine(module)

      return Array.prepend(rows, anchorLine)
    }

    const blocks = Array.map(modules, moduleMembershipLines)

    const appendMembershipBlock = (
      lines: ReadonlyArray<string>,
      block: ReadonlyArray<string>,
      index: number
    ) =>
      strictEqual(0)(index)
        ? Array.appendAll(lines, block)
        : pipe(lines, Array.append(""), Array.appendAll(block))

    const emptyLines = Array.empty<string>()

    return Array.reduce(blocks, emptyLines, appendMembershipBlock)
  }

  const moduleSlicesFromItems = (
    items: ReadonlyArray<PlacementElement>
  ): ReadonlyArray<ModuleSlice> => {
    const moduleAnchorEntity = (module: ModuleSlice) =>
      pipe(module.entities, Array.head, Option.getOrThrow)

    const moduleAnchorKey = (module: ModuleSlice) => moduleAnchorEntity(module).key

    const moduleAnchorPathOrder = Order.mapInput(
      Order.String,
      flow(moduleAnchorKey, Struct.get<PlacementEntity["key"], "path">("path"))
    )

    const moduleAnchorStartOrder = Order.mapInput(
      Order.Number,
      flow(moduleAnchorKey, Struct.get<PlacementEntity["key"], "start">("start"))
    )

    const moduleAnchorEndOrder = Order.mapInput(
      Order.Number,
      flow(moduleAnchorKey, Struct.get<PlacementEntity["key"], "end">("end"))
    )

    const moduleAnchorKindOrder = Order.mapInput(
      Order.Number,
      flow(moduleAnchorKey, Struct.get<PlacementEntity["key"], "syntaxKind">("syntaxKind"))
    )

    const moduleOrder = Order.combine(
      moduleAnchorPathOrder,
      Order.combine(
        moduleAnchorStartOrder,
        Order.combine(moduleAnchorEndOrder, moduleAnchorKindOrder)
      )
    )

    const anchorIdentity = (module: ModuleSlice) => {
      const key = moduleAnchorKey(module)

      return `${key.path}:${key.start}:${key.end}:${key.syntaxKind}`
    }

    const modulesShareAnchor = (left: ModuleSlice, right: ModuleSlice) => {
      const leftIdentity = anchorIdentity(left)
      const rightIdentity = anchorIdentity(right)

      return strictEqual(leftIdentity)(rightIdentity)
    }

    const dedupeModulesByAnchor = (modules: ReadonlyArray<ModuleSlice>) =>
      Array.dedupeWith(modules, modulesShareAnchor)

    return pipe(
      items,
      Array.flatMap((item) => item.data.modules),
      dedupeModulesByAnchor,
      Array.sort(moduleOrder)
    )
  }

  const semanticModulePlacementDataOf = (element: NamedDetection) =>
    deriveCheckedData(Schema.is(SemanticModulePlacementData), element)

  const semanticModulePlacementAdviceBody = (
    elements: ReadonlyArray<NamedDetection>
  ): ReadonlyArray<Advice> => {
    // Signal names stay bound once because advisers and wirings must not re-spell them.
    const semanticModulePlacementAdviceExamples = makePackageExamples(
      stableSemanticModulePlacementName
    )
    const isMixedData = Schema.is(MixedPhysicalModulePlacementData)
    const pathOf = (item: PlacementElement) => item.namedDetection.detection.location.path

    const uniquePhysicalPaths = (modules: ReadonlyArray<ModuleSlice>) =>
      pipe(
        modules,
        Array.flatMap(Struct.get<ModuleSlice, "physicalModulePaths">("physicalModulePaths")),
        Array.dedupe,
        Array.sort(Order.String)
      )

    const mixedTitle = "mixed Physical Module"
    const splitTitle = "split Semantic Modules"
    const physicalModulePathRow = (path: string) => `    - ${path}`

    const physicalModuleLines = (paths: ReadonlyArray<string>) => {
      const rows = Array.map(paths, physicalModulePathRow)

      return Array.prepend(rows, "  Current Physical Modules")
    }

    const entityCount = (modules: ReadonlyArray<ModuleSlice>) =>
      pipe(
        modules,
        Array.map((module: ModuleSlice) => module.entities.length),
        Array.reduce(0, (total, count) => total + count)
      )

    const entitiesInPath = (path: string) => (modules: ReadonlyArray<ModuleSlice>) => {
      const entities = Array.flatMap(modules, Struct.get<ModuleSlice, "entities">("entities"))

      const entityPathEquals = (entity: (typeof entities)[number]) =>
        strictEqual(path)(entity.key.path)

      return Array.reduce(entities, 0, (count, entity) =>
        entityPathEquals(entity) ? count + 1 : count
      )
    }

    const mixedRemediationLead = (moduleCount: number) =>
      `This Physical Module contains members of ${moduleCount} Semantic Modules. Separate the modules without splitting any membership listed below. No destination or move direction is inferred.`

    const splitRemediationLead = (splitCount: number) => {
      const noun = strictEqual(1)(splitCount) ? "Semantic Module" : "Semantic Modules"
      const verb = strictEqual(1)(splitCount) ? "spans" : "span"

      return (
        `${splitCount} ${noun} anchored in this Physical Module ${verb} multiple Physical Modules. ` +
        "Place each listed Semantic Module in one Physical Module. The anchor is only a deterministic reporting location; it is not a move recommendation."
      )
    }

    const mixedRemediation = (modules: ReadonlyArray<ModuleSlice>) => {
      const lead = mixedRemediationLead(modules.length)
      const membership = interleaveModules(modules)

      return pipe(Array.make(lead, ""), Array.appendAll(membership), Array.join("\n"))
    }

    const splitRemediation = (modules: ReadonlyArray<ModuleSlice>) => {
      const lead = splitRemediationLead(modules.length)
      const membership = interleaveModules(modules)
      const paths = uniquePhysicalPaths(modules)
      const physical = physicalModuleLines(paths)

      return pipe(
        Array.make(lead, ""),
        Array.appendAll(membership),
        Array.append(""),
        Array.appendAll(physical),
        Array.join("\n")
      )
    }

    const mixedEvidence = (path: string) => (modules: ReadonlyArray<ModuleSlice>) => {
      const here = entitiesInPath(path)(modules)
      const hereItem = EvidenceItem.make({ measure: "code-entities-here", count: here })
      const modulesItem = EvidenceItem.make({ measure: "semantic-modules", count: modules.length })

      return Array.make(hereItem, modulesItem)
    }

    const splitEvidence = (modules: ReadonlyArray<ModuleSlice>) => {
      const codeEntityCount = entityCount(modules)
      const physicalPaths = uniquePhysicalPaths(modules)

      const entitiesItem = EvidenceItem.make({
        measure: "code-entities",
        count: codeEntityCount
      })

      const physicalItem = EvidenceItem.make({
        measure: "physical-modules",
        count: physicalPaths.length
      })

      const splitItem = EvidenceItem.make({
        measure: "split-semantic-modules",
        count: modules.length
      })

      return Array.make(entitiesItem, physicalItem, splitItem)
    }

    const isPlacementElement = flow(
      Struct.get<NamedDetection, "name">("name"),
      strictEqual(stableSemanticModulePlacementName)
    )

    const placementData = (element: NamedDetection): Option.Option<SemanticModulePlacementData> => {
      const matchesPlacement = isPlacementElement(element)

      const placementElementOption = matchesPlacement
        ? Option.some(element)
        : Option.none<NamedDetection>()

      return pipe(placementElementOption, Option.flatMap(semanticModulePlacementDataOf))
    }

    const isSplitData = Schema.is(SplitSemanticModulePlacementData)

    const placementElementResultOf = (element: NamedDetection) => {
      const dataOption = placementData(element)
      const dataResult = Result.fromOption(Function.constVoid)(dataOption)

      const makePlacementElementFromData = (data: SemanticModulePlacementData) =>
        new PlacementElement({ namedDetection: element, data })

      return Result.map(dataResult, makePlacementElementFromData)
    }

    const placementElements = (elements: ReadonlyArray<NamedDetection>) =>
      Array.filterMap(elements, placementElementResultOf)

    // Prefer Struct.get for sole property reads because dedicated wrappers hide Effect accessors.
    const placementElementData = Struct.get<PlacementElement, "data">("data")
    const itemDataIsMixed = flow(placementElementData, isMixedData)
    const itemDataIsSplit = flow(placementElementData, isSplitData)

    const mixedElements = (elements: ReadonlyArray<PlacementElement>) =>
      Array.filter(elements, itemDataIsMixed)

    const splitElements = (elements: ReadonlyArray<PlacementElement>) =>
      Array.filter(elements, itemDataIsSplit)

    const mixedPhysicalModulePath = (items: ReadonlyArray<PlacementElement>) =>
      pipe(
        items,
        Array.head,
        Option.map(Struct.get<PlacementElement, "data">("data")),
        Option.filter(isMixedData),
        Option.map(
          Struct.get<MixedPhysicalModulePlacementData, "physicalModulePath">("physicalModulePath")
        ),
        Option.getOrThrow
      )

    const makeMixedPathAdvice =
      (mixed: ReadonlyArray<PlacementElement>) =>
      (filePath: string): Advice => {
        const itemPathEqualsFilePath = flow(pathOf, strictEqual(filePath))
        const atPath = Array.filter(mixed, itemPathEqualsFilePath)
        const physicalModulePath = mixedPhysicalModulePath(atPath)
        const modules = moduleSlicesFromItems(atPath)
        const location = Location.make({ path: filePath })
        const remediation = mixedRemediation(modules)
        const evidence = mixedEvidence(physicalModulePath)(modules)

        return Advice.make({
          location,
          level: "file",
          title: mixedTitle,
          remediation,
          evidence,
          examples: semanticModulePlacementAdviceExamples
        })
      }

    const makeSplitPathAdvice =
      (split: ReadonlyArray<PlacementElement>) =>
      (filePath: string): Advice => {
        const itemPathEqualsFilePath = flow(pathOf, strictEqual(filePath))
        const atPath = Array.filter(split, itemPathEqualsFilePath)
        const modules = moduleSlicesFromItems(atPath)
        const location = Location.make({ path: filePath })
        const remediation = splitRemediation(modules)
        const evidence = splitEvidence(modules)

        return Advice.make({
          location,
          level: "file",
          title: splitTitle,
          remediation,
          evidence,
          examples: semanticModulePlacementAdviceExamples
        })
      }

    const uniquePaths = (items: ReadonlyArray<PlacementElement>) =>
      pipe(items, Array.map(pathOf), Array.dedupe, Array.sort(Order.String))

    const placement = placementElements(elements)
    const mixed = mixedElements(placement)
    const split = splitElements(placement)
    const mixedAdvice = pipe(mixed, uniquePaths, Array.map(makeMixedPathAdvice(mixed)))
    const splitAdvice = pipe(split, uniquePaths, Array.map(makeSplitPathAdvice(split)))

    // Mixed precedes split at one path because report sort is level then path only.
    return Array.appendAll(mixedAdvice, splitAdvice)
  }

  const semanticModulePlacementAdvice = deriveSignals(semanticModulePlacementAdviceBody)

  // SemanticModulePlacementAdviser keeps name and advice together because reports share them.
  class SemanticModulePlacementAdviser extends Data.Class<{
    readonly semanticModulePlacementName: typeof stableSemanticModulePlacementName
    readonly semanticModulePlacementAdvice: typeof semanticModulePlacementAdvice
  }> {}

  return new SemanticModulePlacementAdviser({
    semanticModulePlacementName: stableSemanticModulePlacementName,
    semanticModulePlacementAdvice
  })
}

export const { semanticModulePlacementName, semanticModulePlacementAdvice } =
  makeArchitectureExploreSemanticModulePlacementAdviser()

export const architectureExploreSemanticModulePlacementAdviserCatalog = Array.of(
  Tuple.make(11, semanticModulePlacementAdvice)
)
