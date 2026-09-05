import type { PlanDefinition } from "./review-types"

export const plan: PlanDefinition = {
  id: "replace-me",
  version: "1.0.0",
  title: "A more precise greeting contract",
  description: "Illustrative baseline: require a non-empty name and make the greeting schema explicit. Inspect scope and exact contracts before running the story property.",
  stories: [
    { id: "story.example", label: "Run the example", outcome: "Every valid generated name produces a greeting." },
  ],
  storyTests: [
    { id: "test.example", label: "greets every generated name", storyId: "story.example", fileId: "file.test.example", relativePath: "src/story-tests/example.test.ts", proposedCodeIds: ["code.input", "code.run-example"] },
  ],
  currentCode: [
    { id: "code.input", category: "Schema", label: "ExampleInput", fileId: "file.current.example", relativePath: "src/current/example.ts", symbol: "ExampleInput", scope: "Greeting" },
    { id: "code.greeting", category: "Type", label: "ExampleGreeting", fileId: "file.current.example", relativePath: "src/current/example.ts", symbol: "ExampleGreeting", scope: "Greeting" },
    { id: "code.example-service-shape", category: "Interface", label: "ExampleServiceShape", fileId: "file.current.example", relativePath: "src/current/example.ts", symbol: "ExampleServiceShape", scope: "Greeting", dependencyIds: ["code.input", "code.greeting"] },
    { id: "code.example-service", category: "Service", label: "ExampleService", fileId: "file.current.example", relativePath: "src/current/example.ts", symbol: "ExampleService", scope: "Greeting", dependencyIds: ["code.example-service-shape"] },
    { id: "code.run-example", category: "EffectfulFunction", label: "runExample", fileId: "file.current.example", relativePath: "src/current/example.ts", symbol: "runExample", scope: "Greeting", contract: { inputSchemaIds: ["code.input"], successSchemaId: "code.greeting", errorIds: [], serviceIds: ["code.example-service"] } },
  ],
  proposedCode: [
    { id: "code.input", category: "Schema", label: "ExampleInput", fileId: "file.example", relativePath: "src/domain/example.ts", symbol: "ExampleInput", scope: "Greeting", rationale: "The input contract excludes empty names before the service is called." },
    { id: "code.greeting", category: "Schema", label: "ExampleGreeting", fileId: "file.example", relativePath: "src/domain/example.ts", symbol: "ExampleGreeting", scope: "Greeting", rationale: "The output has a runtime schema as well as a TypeScript type." },
    { id: "code.example-service-shape", category: "Interface", label: "ExampleServiceShape", fileId: "file.example", relativePath: "src/domain/example.ts", symbol: "ExampleServiceShape", scope: "Greeting", dependencyIds: ["code.input", "code.greeting"] },
    { id: "code.example-service", category: "Service", label: "ExampleService", fileId: "file.example", relativePath: "src/domain/example.ts", symbol: "ExampleService", scope: "Greeting", dependencyIds: ["code.example-service-shape"] },
    { id: "code.run-example", category: "EffectfulFunction", label: "runExample", fileId: "file.example", relativePath: "src/domain/example.ts", symbol: "runExample", scope: "Greeting", contract: { inputSchemaIds: ["code.input"], successSchemaId: "code.greeting", errorIds: [], serviceIds: ["code.example-service"] } },
  ],
}
