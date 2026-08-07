import type { SemanticModuleFixtureManifest } from "../../semanticModuleFixtureManifest.js"

export const barrierManifest = {
  entities: [
    {
      label: "shared-prod",
      selector: {
        path: "src/shared.ts",
        declarationKind: "InterfaceDeclaration",
        displayName: "Shared",
        occurrence: 1
      }
    },
    {
      label: "token-prod",
      selector: {
        path: "src/shared.ts",
        declarationKind: "InterfaceDeclaration",
        displayName: "SharedToken",
        occurrence: 1
      }
    },
    {
      label: "shared-test",
      selector: {
        path: "src/tests/shared.test.ts",
        declarationKind: "InterfaceDeclaration",
        displayName: "Shared",
        occurrence: 1
      }
    },
    {
      label: "token-test",
      selector: {
        path: "src/tests/shared.test.ts",
        declarationKind: "InterfaceDeclaration",
        displayName: "SharedToken",
        occurrence: 1
      }
    }
  ],
  modules: [["shared-prod"], ["token-prod"], ["shared-test"], ["token-test"]]
} as const satisfies SemanticModuleFixtureManifest
