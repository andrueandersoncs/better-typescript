#!/usr/bin/env node
import { Command, Options } from "@effect/cli"
import { NodeContext, NodeRuntime } from "@effect/platform-node"
import { Console, Effect } from "effect"
import { formatMatches } from "./output/formatMatches.js"
import { loadProject } from "./project/loadProject.js"
import { rules } from "./rules/index.js"
import type { RuleMatch } from "./rules/index.js"
import { runRules } from "./runner/runRules.js"

const project = Options.directory("project", { exists: "yes" }).pipe(
  Options.withDefault(process.cwd())
)

const analyzeProject = Effect.fn("analyzeProject")(function* (projectPath: string) {
  const workspace = yield* loadProject(projectPath)
  const matches = dedupeMatches(
    workspace.projects.flatMap((loadedProject) => runRules(loadedProject, rules))
  )

  if (matches.length === 0) {
    return `No rule matches found in ${workspace.rootPath}.`
  }

  yield* Effect.sync(() => {
    process.exitCode = 1
  })
  return formatMatches(matches)
})

const dedupeMatches = (matches: ReadonlyArray<RuleMatch>): ReadonlyArray<RuleMatch> => [
  ...new Map(matches.map((match) => [matchKey(match), match])).values()
]

const matchKey = (match: RuleMatch): string =>
  [match.ruleId, match.fileName, match.line, match.column, match.message].join(":")

const command = Command.make("better-typescript", { project }, ({ project }) =>
  analyzeProject(project).pipe(
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
