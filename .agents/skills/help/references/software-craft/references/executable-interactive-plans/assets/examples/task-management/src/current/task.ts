import { Schema } from "effect"

export const TaskId = Schema.Int.check(Schema.isGreaterThan(0))

export const TaskTitle = Schema.String.check(Schema.isMinLength(1), Schema.isMaxLength(120))

export const TaskStatus = Schema.Union([Schema.Literal("open"), Schema.Literal("done")])

export const Task = Schema.Struct({
  id: TaskId,
  title: TaskTitle,
  status: TaskStatus,
})
export type Task = Schema.Schema.Type<typeof Task>

export const Tasks = Schema.Array(Task)
export type Tasks = Schema.Schema.Type<typeof Tasks>

export const CreateTaskInput = Schema.Struct({ title: TaskTitle })
export type CreateTaskInput = Schema.Schema.Type<typeof CreateTaskInput>
