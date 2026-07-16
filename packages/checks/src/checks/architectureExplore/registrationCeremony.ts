import { Array, Function, Result, Struct, pipe } from "effect"
import { Advice } from "@better-typescript/core/engine/derive/data"
import { adviceLocation, deriveSignals, evidenceItem } from "@better-typescript/core/engine/derive"
import type { NamedDetection } from "@better-typescript/core/engine/derive/data"
import type { NonEmptyRefactorExamples } from "@better-typescript/core/engine/example/data"
import { fixtureRefactorExamples } from "../../fixtureExamples.js"
import { importUsageDataOf } from "./evidence.js"
import { importUsageName } from "./names.js"

export const registrationCeremonyExamples: NonEmptyRefactorExamples =
  fixtureRefactorExamples("registration-ceremony")

const minimumImportCount = 15
const minimumLowRefRatio = 0.8

const registrationAdvice = (elements: ReadonlyArray<NamedDetection>): ReadonlyArray<Advice> => {
  const usages = pipe(
    elements,
    Array.filter((element) => element.name === importUsageName),
    Array.filterMap(Function.flow(importUsageDataOf, Result.fromOption(Function.constVoid))),
    Array.filter((data) => !data.fromTest)
  )

  const importers = pipe(usages, Array.map(Struct.get("importerWorkspacePath")), Array.dedupe)

  return Array.filterMap(importers, (importerPath) => {
    const atImporter = Array.filter(usages, (data) => data.importerWorkspacePath === importerPath)
    const importCount = pipe(atImporter, Array.map(Struct.get("specifier")), Array.dedupe).length
    const names = Array.flatMap(atImporter, Struct.get("names"))
    const totalNames = names.length

    if (totalNames === 0) {
      return Result.failVoid
    }

    const lowRefNames = Array.filter(names, (name) => name.referenceCount <= 2).length
    const ratio = lowRefNames / totalNames
    const importsBelowMinimum = importCount < minimumImportCount
    const ratioBelowMinimum = ratio < minimumLowRefRatio
    const minimumChecks = Array.make(importsBelowMinimum, ratioBelowMinimum)
    const isBelowMinimum = Array.some(minimumChecks, Boolean)

    if (isBelowMinimum) {
      return Result.failVoid
    }

    const location = adviceLocation(importerPath)
    const importedModulesItem = evidenceItem("imported-modules", importCount)
    const singleUseItem = evidenceItem("single-use-imports", lowRefNames)
    const evidence = Array.make(importedModulesItem, singleUseItem)

    const advice = new Advice({
      location,
      level: "file",
      title: "registration ceremony",
      remediation:
        "A registration ceremony restates every Module once as an import and again as a collected entry. " +
        "Collapse it behind one authoring interface so adding an entry touches one file.",
      evidence,
      examples: registrationCeremonyExamples
    })

    return Result.succeed(advice)
  })
}

export const registrationCeremony = deriveSignals(registrationAdvice)
