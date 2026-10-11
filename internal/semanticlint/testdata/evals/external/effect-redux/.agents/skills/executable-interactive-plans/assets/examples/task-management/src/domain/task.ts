import { Schema } from "effect"

export const TaskId = Schema.Int.check(Schema.isGreaterThan(0))

export const TaskTitle = Schema.String.check(Schema.isMinLength(1), Schema.isMaxLength(80))

export const Task = Schema.Struct({
  id: TaskId,
  title: TaskTitle,
  completed: Schema.Boolean,
})
export type Task = Schema.Schema.Type<typeof Task>

export const Tasks = Schema.Array(Task)
export type Tasks = Schema.Schema.Type<typeof Tasks>

export const CreateTaskInput = Schema.Struct({ title: TaskTitle })
export type CreateTaskInput = Schema.Schema.Type<typeof CreateTaskInput>

export const CompleteTaskInput = Schema.Struct({ id: TaskId })
export type CompleteTaskInput = Schema.Schema.Type<typeof CompleteTaskInput>

export class TaskNotFound extends Schema.Error<TaskNotFound>("TaskNotFound")({
  id: TaskId,
}) {}
