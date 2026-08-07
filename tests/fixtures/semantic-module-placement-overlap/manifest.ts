import type { SemanticModuleFixtureManifest } from "../../semanticModuleFixtureManifest.js"

export const overlapManifest = {
  entities: [
    {
      label: "OverlapTokenHome",
      selector: {
        path: "src/home.ts",
        declarationKind: "InterfaceDeclaration",
        displayName: "OverlapToken",
        occurrence: 1
      }
    },
    {
      label: "OverlapLocal",
      selector: {
        path: "src/home.ts",
        declarationKind: "TypeAliasDeclaration",
        displayName: "OverlapLocal",
        occurrence: 1
      }
    },
    {
      label: "OverlapTokenAway",
      selector: {
        path: "src/token-away.ts",
        declarationKind: "InterfaceDeclaration",
        displayName: "OverlapToken",
        occurrence: 1
      }
    }
  ],
  modules: [
    ["OverlapTokenHome", "OverlapTokenAway"],
    ["OverlapLocal"]
  ]
} as const satisfies SemanticModuleFixtureManifest
