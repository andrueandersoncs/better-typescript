import type { TaskCommand } from "./data.js"

const runTask = (command: TaskCommand): string =>
  `${command.taskIdentifier}:${command.taskPriority}`

const runPrimary = (): string =>
  runTask({ taskIdentifier: "primary", taskPriority: 1 })

const runSecondary = (): string =>
  runTask({ taskIdentifier: "secondary", taskPriority: 2 })

void runPrimary
void runSecondary
