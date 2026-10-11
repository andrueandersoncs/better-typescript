import type { PlanDefinition } from "./review-types"

export const plan: PlanDefinition = {
  id: "replace-me",
  version: "1.0.0",
  title: "Executable story tests",
  description: "Agree on the Schemas, Errors, Services, and Effectful function signatures, then run the story properties.",
  stories: [
    { id: "story.example", label: "Run the example", outcome: "Every valid generated name produces a greeting." },
  ],
  storyTests: [
    { id: "test.example", label: "greets every generated name", storyId: "story.example", fileId: "file.test.example", relativePath: "src/story-tests/example.test.ts", proposedCodeIds: ["code.input", "code.example-service", "code.run-example"] },
  ],
  proposedCode: [
    { id: "code.input", category: "Schema", label: "ExampleInput", fileId: "file.example", relativePath: "src/domain/example.ts", symbol: "ExampleInput" },
    { id: "code.example-service", category: "Service", label: "ExampleService", fileId: "file.example", relativePath: "src/domain/example.ts", symbol: "ExampleService" },
    { id: "code.run-example", category: "EffectfulFunction", label: "runExample", fileId: "file.example", relativePath: "src/domain/example.ts", symbol: "runExample" },
  ],
}
