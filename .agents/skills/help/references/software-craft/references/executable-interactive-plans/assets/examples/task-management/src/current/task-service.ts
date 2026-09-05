import { Context, Effect } from "effect"
import type { CreateTaskInput, Task, Tasks } from "./task"

export interface TaskServiceShape {
  readonly create: (input: CreateTaskInput) => Effect.Effect<Task>
  readonly list: Effect.Effect<Tasks>
}

export class TaskService extends Context.Service<TaskService, TaskServiceShape>()("TaskService") {}

export const createTask = (input: CreateTaskInput): Effect.Effect<Task, never, TaskService> =>
  Effect.flatMap(TaskService, (service) => service.create(input))

export const listTasks: Effect.Effect<Tasks, never, TaskService> =
  Effect.flatMap(TaskService, (service) => service.list)
