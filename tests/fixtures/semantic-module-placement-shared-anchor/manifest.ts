import type { SemanticModuleFixtureManifest } from "../../semanticModuleFixtureManifest.js"

export const sharedAnchorManifest = {
  entities: [
    {
      label: "SharedAlphaAnchor",
      selector: {
        path: "src/anchor.ts",
        declarationKind: "InterfaceDeclaration",
        displayName: "SharedAlpha",
        occurrence: 1
      }
    },
    {
      label: "SharedBetaAnchor",
      selector: {
        path: "src/anchor.ts",
        declarationKind: "InterfaceDeclaration",
        displayName: "SharedBeta",
        occurrence: 1
      }
    },
    {
      label: "SharedAlphaRight",
      selector: {
        path: "src/z-alpha.ts",
        declarationKind: "InterfaceDeclaration",
        displayName: "SharedAlpha",
        occurrence: 1
      }
    },
    {
      label: "SharedBetaRight",
      selector: {
        path: "src/z-beta.ts",
        declarationKind: "InterfaceDeclaration",
        displayName: "SharedBeta",
        occurrence: 1
      }
    }
  ],
  modules: [
    ["SharedAlphaAnchor", "SharedAlphaRight"],
    ["SharedBetaAnchor", "SharedBetaRight"]
  ]
} as const satisfies SemanticModuleFixtureManifest
