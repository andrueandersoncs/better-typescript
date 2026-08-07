import type { SemanticModuleFixtureManifest } from "../../semanticModuleFixtureManifest.js"

export const mixedManifest = {
  entities: [
    {
      label: "MixedLeft",
      selector: {
        path: "src/mixed.ts",
        declarationKind: "TypeAliasDeclaration",
        displayName: "MixedLeft",
        occurrence: 1
      }
    },
    {
      label: "MixedRight",
      selector: {
        path: "src/mixed.ts",
        declarationKind: "TypeAliasDeclaration",
        displayName: "MixedRight",
        occurrence: 1
      }
    }
  ],
  modules: [["MixedLeft"], ["MixedRight"]]
} as const satisfies SemanticModuleFixtureManifest
