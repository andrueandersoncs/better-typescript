import { Stream, String as StringModule, pipe } from "effect"
import type { RuntimeTask } from "./data.js"

export const uppercaseRuntimeTask = (
  task: RuntimeTask
): Stream.Stream<string> => pipe(task.stream, Stream.map(StringModule.toUpperCase))

export const runtimeTaskLengths = (
  task: RuntimeTask
): Stream.Stream<number> => pipe(task.stream, Stream.map(StringModule.length))
