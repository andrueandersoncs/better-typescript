import * as path from "node:path"
import { fileURLToPath } from "node:url"
import { Array, Effect } from "effect"
import { Signal } from "@better-typescript/core/engine/signal/data"
import { effectQualityWiring } from "@better-typescript/guidance/effectQuality/advice"
import { loadProject } from "@better-typescript/core/project/loadProject"
import { runPolicyOnProject } from "@better-typescript/core/project/loadProject/runPolicyOnProject"
import { isProgramPolicy } from "@better-typescript/core/engine/wiring/isProgramPolicy"

const testDirectory = path.dirname(fileURLToPath(import.meta.url))
export const fixturePath = path.join(testDirectory, "fixtures", "effect-quality")

export const runSignals = async (): Promise<ReadonlyArray<Signal>> => {
  const workspace = await Effect.runPromise(loadProject(fixturePath))

  return Promise.all(
    effectQualityWiring.policies.filter(isProgramPolicy).map(async (named) => {
      const detections = await Promise.all(
        workspace.projects.map((project) => Effect.runPromise(runPolicyOnProject(named)(project)))
      )

      return new Signal({
        name: named.name,
        reported: named.reported,
        detections: detections.flat(),
        examples: named.examples
      })
    })
  )
}
