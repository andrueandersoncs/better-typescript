import { Array, Effect } from "effect"
import { loadProject, runCheckOnProject } from "@better-typescript/core/project/loadProject"
import { noThrow } from "@better-typescript/checks/noThrow"

// This example is documentation because the programmatic surface deserves one runnable reference.
const projectDirectory = process.argv[2] ?? "."

const detections = await Effect.runPromise(
  Effect.gen(function* () {
    const workspace = yield* loadProject(projectDirectory)

    const perProject = yield* Effect.forEach(
      workspace.projects,
      runCheckOnProject(Array.of(noThrow.check))
    )

    return Array.flatten(perProject)
  })
)

for (const found of detections) {
  console.log(`${found.location.path}:${found.location.line} ${found.message}`)
}
