import { Array, Function, Result, Struct, pipe } from "effect"
import { Advice } from "@better-typescript/core/engine/derive/data"
import {
  makeAdviceLocation,
  deriveSignals,
  makeEvidenceItem
} from "@better-typescript/core/engine/derive"
import type { NamedDetection } from "@better-typescript/core/engine/derive/data"
import { packageExamples } from "../../defineCheck.js"
import { importUsageDataOf } from "./evidence.js"
import { importUsageName } from "./names.js"

export const registrationCeremonyExamples = packageExamples("registration-ceremony")

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

    const lowRefNames = Array.countBy(names, (name) => name.referenceCount <= 2)
    const ratio = lowRefNames / totalNames
    const importsBelowMinimum = importCount < minimumImportCount
    const ratioBelowMinimum = ratio < minimumLowRefRatio
    const minimumChecks = Array.make(importsBelowMinimum, ratioBelowMinimum)
    const isBelowMinimum = Array.some(minimumChecks, Boolean)

    if (isBelowMinimum) {
      return Result.failVoid
    }

    const location = makeAdviceLocation(importerPath)
    const importedModulesItem = makeEvidenceItem("imported-modules", importCount)
    const singleUseItem = makeEvidenceItem("single-use-imports", lowRefNames)
    const evidence = Array.make(importedModulesItem, singleUseItem)
    const examples = registrationCeremonyExamples

    const advice = Advice.make({
      location,
      level: "file",
      title: "registration ceremony",
      remediation:
        "A registration ceremony restates every Module once as an import and again as a collected entry. " +
        "Collapse it behind one authoring interface so adding an entry touches one file.",
      evidence,
      examples
    })

    return Result.succeed(advice)
  })
}

export const registrationCeremony = deriveSignals(registrationAdvice)
