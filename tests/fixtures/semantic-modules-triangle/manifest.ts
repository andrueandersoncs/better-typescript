import type { SemanticModuleFixtureManifest } from "../../semanticModuleFixtureManifest.js"

export const triangleManifest = {
  entities: [
    {
      label: "point-x",
      selector: {
        path: "src/triangle.ts",
        declarationKind: "InterfaceDeclaration",
        displayName: "Point",
        occurrence: 1
      }
    },
    {
      label: "point-y",
      selector: {
        path: "src/triangle.ts",
        declarationKind: "InterfaceDeclaration",
        displayName: "Point",
        occurrence: 2
      }
    },
    {
      label: "point-namespace",
      selector: {
        path: "src/triangle.ts",
        declarationKind: "ModuleDeclaration",
        displayName: "Point",
        occurrence: 1
      }
    }
  ],
  modules: [["point-x", "point-y", "point-namespace"]]
} as const satisfies SemanticModuleFixtureManifest
