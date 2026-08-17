import { ImportUsageData } from "@better-typescript/matchers/builtins/importUsage"
import { ImportedNameUsage } from "@better-typescript/matchers/builtins/architectureExplore/importedNameUsage"

export const nameUsage = (name: string, referenceCount: number, callCount = 0): ImportedNameUsage =>
  ImportedNameUsage.make({ name, referenceCount, callCount })

export const importUsage = (
  specifier: string,
  importerWorkspacePath: string,
  referenceCount: number,
  fromTest = false,
  callCount = 0
): ImportUsageData =>
  ImportUsageData.make({
    specifier,
    importerWorkspacePath,
    fromTest,
    names: [nameUsage(specifier.split("/").at(-1) ?? specifier, referenceCount, callCount)]
  })
