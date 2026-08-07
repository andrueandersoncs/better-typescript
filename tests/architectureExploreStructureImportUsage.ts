import { ImportUsageData } from "@better-typescript/matchers/builtins/importUsage"
import { ImportedNameUsage } from "@better-typescript/matchers/builtins/architectureExplore/importedNameUsage"

export const nameUsage = (name: string, referenceCount: number): ImportedNameUsage =>
  ImportedNameUsage.make({ name, referenceCount, callCount: referenceCount })

export const importUsage = (
  specifier: string,
  importerWorkspacePath: string,
  referenceCount: number,
  fromTest = false
): ImportUsageData =>
  ImportUsageData.make({
    specifier,
    importerWorkspacePath,
    fromTest,
    names: [nameUsage(specifier.split("/").at(-1) ?? specifier, referenceCount)]
  })
