interface TaskCommand { task: string; priority: number }
const runTask = (command: TaskCommand): string => command.task;
export const bad = runTask({ task: "work", priority: 1 });
const command: TaskCommand = { task: "clean", priority: 2 };
export const clean = runTask(command);
