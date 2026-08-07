import type { SemanticModuleFixtureManifest } from "../../semanticModuleFixtureManifest.js"

export const cleanManifest = {
  entities: [
    {
      label: "CleanAlpha",
      selector: {
        path: "src/alpha.ts",
        declarationKind: "TypeAliasDeclaration",
        displayName: "CleanAlpha",
        occurrence: 1
      }
    },
    {
      label: "CleanBeta",
      selector: {
        path: "src/beta.ts",
        declarationKind: "TypeAliasDeclaration",
        displayName: "CleanBeta",
        occurrence: 1
      }
    }
  ],
  modules: [["CleanAlpha"], ["CleanBeta"]]
} as const satisfies SemanticModuleFixtureManifest
