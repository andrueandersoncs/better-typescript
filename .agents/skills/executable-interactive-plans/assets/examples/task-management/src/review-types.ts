export type TestStatus = "not-run" | "passed" | "failed"

export interface StoryDefinition {
  readonly id: string
  readonly label: string
  readonly outcome: string
}

export interface StoryTestDefinition {
  readonly id: string
  readonly label: string
  readonly storyId: string
  readonly fileId: string
  readonly relativePath: string
  readonly proposedCodeIds: ReadonlyArray<string>
}

export const codeCategories = ["Schema", "Error", "Service", "EffectfulFunction"] as const
export type CodeCategory = (typeof codeCategories)[number]

export interface CodeDefinition {
  readonly id: string
  readonly category: CodeCategory
  readonly label: string
  readonly fileId: string
  readonly relativePath: string
  readonly symbol: string
}

export interface PlanDefinition {
  readonly id: string
  readonly version: string
  readonly title: string
  readonly description: string
  readonly stories: ReadonlyArray<StoryDefinition>
  readonly storyTests: ReadonlyArray<StoryTestDefinition>
  readonly proposedCode: ReadonlyArray<CodeDefinition>
}

export interface SourcePosition { readonly line: number; readonly column: number }
export interface SourceRange { readonly start: SourcePosition; readonly end: SourcePosition }
export interface CodeFile { readonly fileId: string; readonly relativePath: string; readonly content: string; readonly contentHash: string }
export interface HydratedStoryTest extends StoryTestDefinition { readonly range: SourceRange }
export interface HydratedCodeDefinition extends CodeDefinition { readonly range: SourceRange }
export interface TestResult { readonly status: TestStatus; readonly output: string }
export interface Bootstrap {
  readonly plan: PlanDefinition
  readonly sourceSnapshotId: string
  readonly files: ReadonlyArray<CodeFile>
  readonly storyTests: ReadonlyArray<HydratedStoryTest>
  readonly proposedCode: ReadonlyArray<HydratedCodeDefinition>
}
