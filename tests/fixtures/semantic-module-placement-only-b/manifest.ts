import type { SemanticModuleFixtureManifest } from "../../semanticModuleFixtureManifest.js"

export const placementOnlyBManifest = {
  entities: [
    {
      label: "PlacementOnlyLeft",
      selector: {
        path: "src/left.ts",
        declarationKind: "InterfaceDeclaration",
        displayName: "PlacementOnly",
        occurrence: 1
      }
    },
    {
      label: "PlacementLocal",
      selector: {
        path: "src/left.ts",
        declarationKind: "TypeAliasDeclaration",
        displayName: "PlacementLocal",
        occurrence: 1
      }
    },
    {
      label: "PlacementOnlyRight",
      selector: {
        path: "src/right.ts",
        declarationKind: "InterfaceDeclaration",
        displayName: "PlacementOnly",
        occurrence: 1
      }
    }
  ],
  modules: [
    ["PlacementOnlyLeft", "PlacementOnlyRight"],
    ["PlacementLocal"]
  ]
} as const satisfies SemanticModuleFixtureManifest
