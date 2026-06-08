#!/usr/bin/env node
import { Command, Options } from "@effect/cli"
import { NodeContext, NodeRuntime } from "@effect/platform-node"
import { Console, Effect } from "effect"
import { formatMatches } from "./output/formatMatches.js"
import { loadProject } from "./project/loadProject.js"
import { rules } from "./rules/index.js"
import { runRules } from "./runner/runRules.js"

const project = Options.directory("project", { exists: "yes" }).pipe(
  Options.withDefault(process.cwd())
)

const command = Command.make("better-typescript", { project }, ({ project }) =>
  Effect.try({
    try: () => analyzeProject(project),
    catch: (cause) => (cause instanceof Error ? cause : new Error(String(cause)))
  }).pipe(
    Effect.flatMap((output) => Console.log(output)),
    Effect.catchAll((error) =>
      Console.error(`Error: ${error.message}`).pipe(
        Effect.zipRight(
          Effect.sync(() => {
            process.exitCode = 1
          })
        )
      )
    )
  )
)

const cli = Command.run(command, {
  name: "Better TypeScript",
  version: "0.0.0"
})

cli(process.argv).pipe(Effect.provide(NodeContext.layer), NodeRuntime.runMain)

function analyzeProject(projectPath: string): string {
  const loadedProject = loadProject(projectPath)
  const matches = runRules(loadedProject, rules)

  if (matches.length === 0) {
    return `No rule matches found in ${loadedProject.rootPath}.`
  }

  process.exitCode = 1
  return formatMatches(matches)
}
