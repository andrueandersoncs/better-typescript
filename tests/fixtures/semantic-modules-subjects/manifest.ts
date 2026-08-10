import type { SemanticModuleFixtureManifest } from "../../semanticModuleFixtureManifest.js"

export const subjectsManifest = {
  entities: [
    {
      label: "detectionBatchEquivalence",
      selector: {
        path: "src/aggregate.ts",
        declarationKind: "VariableDeclaration",
        displayName: "detectionBatchEquivalence",
        occurrence: 1
      }
    },
    {
      label: "Detection",
      selector: {
        path: "src/subjectA.ts",
        declarationKind: "ClassDeclaration",
        displayName: "Detection",
        occurrence: 1
      }
    },
    {
      label: "Signal",
      selector: {
        path: "src/subjectB.ts",
        declarationKind: "ClassDeclaration",
        displayName: "Signal",
        occurrence: 1
      }
    },
    {
      label: "WiringSignals",
      selector: {
        path: "src/subjectC.ts",
        declarationKind: "ClassDeclaration",
        displayName: "WiringSignals",
        occurrence: 1
      }
    },
    {
      label: "equivalence",
      selector: {
        path: "src/operations.ts",
        declarationKind: "VariableDeclaration",
        displayName: "equivalence",
        occurrence: 1
      }
    },
    {
      label: "detectionEquals",
      selector: {
        path: "src/operations.ts",
        declarationKind: "VariableDeclaration",
        displayName: "detectionEquals",
        occurrence: 1
      }
    },
    {
      label: "detectionsEquivalence",
      selector: {
        path: "src/operations.ts",
        declarationKind: "VariableDeclaration",
        displayName: "detectionsEquivalence",
        occurrence: 1
      }
    },
    {
      label: "signalEquals",
      selector: {
        path: "src/operations.ts",
        declarationKind: "VariableDeclaration",
        displayName: "signalEquals",
        occurrence: 1
      }
    },
    {
      label: "signalArrayEquivalence",
      selector: {
        path: "src/operations.ts",
        declarationKind: "VariableDeclaration",
        displayName: "signalArrayEquivalence",
        occurrence: 1
      }
    },
    {
      label: "wiringSignalsEquals",
      selector: {
        path: "src/operations.ts",
        declarationKind: "VariableDeclaration",
        displayName: "wiringSignalsEquals",
        occurrence: 1
      }
    },
    {
      label: "wiringSignalsArrayEquivalence",
      selector: {
        path: "src/operations.ts",
        declarationKind: "VariableDeclaration",
        displayName: "wiringSignalsArrayEquivalence",
        occurrence: 1
      }
    },
    {
      label: "orderedDetections",
      selector: {
        path: "src/operations.ts",
        declarationKind: "VariableDeclaration",
        displayName: "orderedDetections",
        occurrence: 1
      }
    },
    {
      label: "detectionIsBlank",
      selector: {
        path: "src/operations.ts",
        declarationKind: "VariableDeclaration",
        displayName: "detectionIsBlank",
        occurrence: 1
      }
    }
  ],
  modules: [
    ["detectionBatchEquivalence", "detectionEquals", "detectionsEquivalence", "Detection"],
    ["equivalence"],
    ["signalEquals", "signalArrayEquivalence", "Signal"],
    ["wiringSignalsEquals", "wiringSignalsArrayEquivalence", "WiringSignals"],
    ["orderedDetections"],
    ["detectionIsBlank"]
  ]
} as const satisfies SemanticModuleFixtureManifest
