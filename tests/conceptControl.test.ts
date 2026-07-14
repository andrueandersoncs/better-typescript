import * as assert from "node:assert/strict"
import * as path from "node:path"
import { test } from "node:test"
import { fileURLToPath } from "node:url"
import { Effect } from "effect"
import { conceptControl } from "@better-typescript/checks/conceptControl"
import { loadProject } from "@better-typescript/core/project/loadProject"
import { runCheckOnProject } from "@better-typescript/core/engine/report"
import type { Detection } from "@better-typescript/core/engine/location/data"

const testDirectory = path.dirname(fileURLToPath(import.meta.url))
const fixturePath = path.join(testDirectory, "fixtures", "concept-control")

const kindOf = (element: Detection): string | undefined => {
  const data = element.data

  if (typeof data !== "object" || data === null || !("kind" in data)) {
    return undefined
  }

  const kind = data.kind

  return typeof kind === "string" ? kind : undefined
}

const runFixture = async (): Promise<ReadonlyArray<Detection>> => {
  const workspace = await Effect.runPromise(loadProject(fixturePath))
  const projects = await Promise.all(
    workspace.projects.map((project) =>
      Effect.runPromise(runCheckOnProject(conceptControl)(project))
    )
  )

  return projects.flat()
}

test("concept-control reports structural concept debt before accepting rationale", async () => {
  const signals = await runFixture()
  const kinds = signals.map(kindOf)
  const expectedKinds = [
    "closed-abstraction",
    "duplicate-shape",
    "function-derived-model",
    "missing-rationale",
    "parameter-bag",
    "pass-through-conversion",
    "redundant-alias",
    "speculative-export",
    "unused-field"
  ]

  const details = signals.map(
    (signal) =>
      `${signal.location.path}:${signal.location.line} ${kindOf(signal)}`
  )

  for (const expected of expectedKinds) {
    assert.ok(
      kinds.includes(expected),
      `missing ${expected}: ${details.join(", ")}`
    )
  }

  const allowedSignals = signals.filter((signal) =>
    signal.location.path.includes("src/allowed/")
  )

  assert.deepEqual(allowedSignals, [])
})
