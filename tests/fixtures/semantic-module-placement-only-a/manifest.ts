import type { SemanticModuleFixtureManifest } from "../../semanticModuleFixtureManifest.js"

export const placementOnlyAManifest = {
  entities: [
    {
      label: "PlacementOnlyLeft",
      selector: {
        path: "src/together.ts",
        declarationKind: "InterfaceDeclaration",
        displayName: "PlacementOnly",
        occurrence: 1
      }
    },
    {
      label: "PlacementOnlyRight",
      selector: {
        path: "src/together.ts",
        declarationKind: "InterfaceDeclaration",
        displayName: "PlacementOnly",
        occurrence: 2
      }
    },
    {
      label: "PlacementLocal",
      selector: {
        path: "src/together.ts",
        declarationKind: "TypeAliasDeclaration",
        displayName: "PlacementLocal",
        occurrence: 1
      }
    }
  ],
  modules: [
    ["PlacementOnlyLeft", "PlacementOnlyRight"],
    ["PlacementLocal"]
  ]
} as const satisfies SemanticModuleFixtureManifest
