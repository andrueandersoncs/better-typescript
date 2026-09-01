import type { PlanDefinition } from "./review-types"

export const plan: PlanDefinition = {
  id: "task-management",
  version: "2.0.0",
  title: "Task management",
  description: "Agree on the Schemas, Errors, Services, and Effectful function signatures, then run each user-story property.",
  stories: [
    { id: "story.create-task", label: "Create a task", outcome: "Every valid task title creates one visible incomplete task." },
    { id: "story.list-tasks", label: "See my tasks", outcome: "Every stored task appears in its stored order." },
    { id: "story.complete-task", label: "Complete a task", outcome: "Completing a task keeps it visible with completed state." },
  ],
  storyTests: [
    { id: "test.create-task", label: "creates every valid generated task as incomplete", storyId: "story.create-task", fileId: "file.test.create-task", relativePath: "src/story-tests/create-task.test.ts", proposedCodeIds: ["code.task-id", "code.task-title", "code.task", "code.tasks", "code.create-input", "code.task-service", "code.create-task", "code.list-tasks"] },
    { id: "test.list-tasks", label: "lists every generated fixture in its stored order", storyId: "story.list-tasks", fileId: "file.test.list-tasks", relativePath: "src/story-tests/list-tasks.test.ts", proposedCodeIds: ["code.task", "code.tasks", "code.task-service", "code.list-tasks"] },
    { id: "test.complete-task", label: "completes every generated incomplete task without removing it", storyId: "story.complete-task", fileId: "file.test.complete-task", relativePath: "src/story-tests/complete-task.test.ts", proposedCodeIds: ["code.task-id", "code.task-title", "code.task", "code.tasks", "code.create-input", "code.complete-input", "code.task-service", "code.create-task", "code.complete-task", "code.list-tasks"] },
    { id: "test.missing-task", label: "fails for every generated missing task id", storyId: "story.complete-task", fileId: "file.test.missing-task", relativePath: "src/story-tests/missing-task.test.ts", proposedCodeIds: ["code.task-id", "code.complete-input", "code.task-not-found", "code.task-service", "code.complete-task"] },
  ],
  proposedCode: [
    { id: "code.task-id", category: "Schema", label: "TaskId", fileId: "file.task", relativePath: "src/domain/task.ts", symbol: "TaskId" },
    { id: "code.task-title", category: "Schema", label: "TaskTitle", fileId: "file.task", relativePath: "src/domain/task.ts", symbol: "TaskTitle" },
    { id: "code.task", category: "Schema", label: "Task", fileId: "file.task", relativePath: "src/domain/task.ts", symbol: "Task" },
    { id: "code.tasks", category: "Schema", label: "Tasks", fileId: "file.task", relativePath: "src/domain/task.ts", symbol: "Tasks" },
    { id: "code.create-input", category: "Schema", label: "CreateTaskInput", fileId: "file.task", relativePath: "src/domain/task.ts", symbol: "CreateTaskInput" },
    { id: "code.complete-input", category: "Schema", label: "CompleteTaskInput", fileId: "file.task", relativePath: "src/domain/task.ts", symbol: "CompleteTaskInput" },
    { id: "code.task-not-found", category: "Error", label: "TaskNotFound", fileId: "file.task", relativePath: "src/domain/task.ts", symbol: "TaskNotFound" },
    { id: "code.task-service", category: "Service", label: "TaskService", fileId: "file.task-service", relativePath: "src/domain/task-service.ts", symbol: "TaskService" },
    { id: "code.create-task", category: "EffectfulFunction", label: "createTask", fileId: "file.task-service", relativePath: "src/domain/task-service.ts", symbol: "createTask" },
    { id: "code.list-tasks", category: "EffectfulFunction", label: "listTasks", fileId: "file.task-service", relativePath: "src/domain/task-service.ts", symbol: "listTasks" },
    { id: "code.complete-task", category: "EffectfulFunction", label: "completeTask", fileId: "file.task-service", relativePath: "src/domain/task-service.ts", symbol: "completeTask" },
  ],
}
