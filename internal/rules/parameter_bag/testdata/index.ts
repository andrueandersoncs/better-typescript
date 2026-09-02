interface TaskCommand { task: string; priority: number }
const runTask = (command: TaskCommand): string => command.task;
export const bad = runTask({ task: "work", priority: 1 });
const command: TaskCommand = { task: "clean", priority: 2 };
export const clean = runTask(command);
const runInferred = (command = { task: "" }): string => command.task;
export const inferred = runInferred({ task: "work" });
interface TableDefinition { name: string }
const make = (fields: TableDefinition): string => fields.name
export const books = make({ name: "books" })
interface BookFields { title: string }
const Schema = {
  Struct(fields: BookFields): BookFields { return fields }
}
export const BookSchema = Schema.Struct({ title: "Dune" })
const Other = {
  Struct(fields: BookFields): BookFields { return fields }
}
export const stillBad = Other.Struct({ title: "Dune" })
