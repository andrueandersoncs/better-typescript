import { Context, Effect, Layer, Ref } from "effect"
import { TaskNotFound, type CompleteTaskInput, type CreateTaskInput, type Task, type Tasks } from "./task"

export interface TaskServiceShape {
  readonly create: (input: CreateTaskInput) => Effect.Effect<Task>
  readonly list: Effect.Effect<Tasks>
  readonly complete: (input: CompleteTaskInput) => Effect.Effect<Task, TaskNotFound>
}

export class TaskService extends Context.Service<TaskService, TaskServiceShape>()("TaskService") {}

export const makeTaskService = (fixture: ReadonlyArray<Task>) =>
  Effect.gen(function* () {
    const tasks = yield* Ref.make(fixture)
    const service: TaskServiceShape = {
      create: ({ title }) => Ref.modify(tasks, (current) => {
        const id = current.reduce((largest, task) => Math.max(largest, task.id), 0) + 1
        const task = { id, title, completed: false }
        return [task, [...current, task]]
      }),
      list: Ref.get(tasks),
      complete: ({ id }) => Effect.gen(function* () {
        const current = yield* Ref.get(tasks)
        const task = current.find((item) => item.id === id)
        if (!task) return yield* TaskNotFound.make({ id })
        const completed = { ...task, completed: true }
        yield* Ref.set(tasks, current.map((item) => item.id === id ? completed : item))
        return completed
      }),
    }
    return Layer.succeed(TaskService, service)
  })

export const createTask = (input: CreateTaskInput): Effect.Effect<Task, never, TaskService> =>
  Effect.flatMap(TaskService, (service) => service.create(input))

export const listTasks: Effect.Effect<Tasks, never, TaskService> =
  Effect.flatMap(TaskService, (service) => service.list)

export const completeTask = (input: CompleteTaskInput): Effect.Effect<Task, TaskNotFound, TaskService> =>
  Effect.flatMap(TaskService, (service) => service.complete(input))
