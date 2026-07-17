import * as assert from "node:assert/strict"
import * as path from "node:path"
import { test } from "node:test"
import { Effect, Stream } from "effect"
import { defaultWiring } from "@better-typescript/checks/preset/defaultWiring"
import { architectureExploreWiring } from "@better-typescript/checks/preset/architectureExploreWiring"
import { functionalCoreEffectWiring } from "@better-typescript/checks/functionalCoreEffect/wiring"
import { packageExampleRoot } from "./packageExamples.js"
import {
  formatRefactorExample,
  loadRefactorExamplesAt
} from "@better-typescript/core/engine/example"
import type { SignalEvent } from "@better-typescript/core/engine/report/data"
import { reportEvents } from "@better-typescript/core/engine/watch"
import { WorkspaceUpdate } from "@better-typescript/core/engine/watch/data"
import { defineConfig } from "@better-typescript/core/engine/wiring"
import type { Wiring } from "@better-typescript/core/engine/wiring/data"
import { contextFromLoadedProject, loadProject } from "@better-typescript/core/project/loadProject"

interface AdviceExampleCase {
  readonly fixtureId: string
  readonly pairId: string
  readonly title: string
  readonly wiring: Wiring
}

const {
  defaultWiring: resolvedDefaultWiring,
  architectureExploreWiring: resolvedArchitectureExploreWiring,
  functionalCoreEffectWiring: resolvedFunctionalCoreEffectWiring
} = await Effect.runPromise(
  Effect.all({
    defaultWiring,
    architectureExploreWiring,
    functionalCoreEffectWiring
  })
)

const adviceExampleCases: ReadonlyArray<AdviceExampleCase> = [
  {
    fixtureId: "high-signal-density",
    pairId: "1",
    title: "high signal density",
    wiring: resolvedDefaultWiring
  },
  {
    fixtureId: "side-effect-laundering",
    pairId: "1",
    title: "colliding fixes on shared expressions",
    wiring: resolvedDefaultWiring
  },
  {
    fixtureId: "pipeline-hostile",
    pairId: "1",
    title: "pipeline-hostile module",
    wiring: resolvedDefaultWiring
  },
  {
    fixtureId: "imperative-state-manager",
    pairId: "1",
    title: "imperative state manager",
    wiring: resolvedDefaultWiring
  },
  {
    fixtureId: "concept-control",
    pairId: "1",
    title: "closed abstraction cluster",
    wiring: resolvedDefaultWiring
  },
  {
    fixtureId: "concept-proliferation",
    pairId: "1",
    title: "concept proliferation",
    wiring: resolvedDefaultWiring
  },
  {
    fixtureId: "hot-subsystem",
    pairId: "1",
    title: "hot subsystem",
    wiring: resolvedDefaultWiring
  },
  {
    fixtureId: "rule-dominance",
    pairId: "1",
    title: "one rule dominates the run",
    wiring: resolvedDefaultWiring
  },
  {
    fixtureId: "systemic-hotspots",
    pairId: "1",
    title: "systemic hotspots",
    wiring: resolvedDefaultWiring
  },
  {
    fixtureId: "deletion-test-shallowness",
    pairId: "1",
    title: "deletion-test shallowness",
    wiring: resolvedArchitectureExploreWiring
  },
  {
    fixtureId: "wide-shallow-interface",
    pairId: "1",
    title: "wide shallow interface",
    wiring: resolvedArchitectureExploreWiring
  },
  {
    fixtureId: "bounce-cluster",
    pairId: "1",
    title: "bounce cluster",
    wiring: resolvedArchitectureExploreWiring
  },
  {
    fixtureId: "leaked-seam",
    pairId: "1",
    title: "leaked seam",
    wiring: resolvedArchitectureExploreWiring
  },
  {
    fixtureId: "test-past-interface",
    pairId: "1",
    title: "test past interface",
    wiring: resolvedArchitectureExploreWiring
  },
  {
    fixtureId: "hard-to-test-hotspot",
    pairId: "1",
    title: "hard-to-test hotspot",
    wiring: resolvedArchitectureExploreWiring
  },
  {
    fixtureId: "hypothetical-seam",
    pairId: "1",
    title: "hypothetical seam",
    wiring: resolvedArchitectureExploreWiring
  },
  {
    fixtureId: "effect-orchestrator",
    pairId: "1",
    title: "overgrown Effect orchestrator",
    wiring: resolvedFunctionalCoreEffectWiring
  },
  {
    fixtureId: "adapter-business-logic",
    pairId: "1",
    title: "business logic in an adapter",
    wiring: resolvedFunctionalCoreEffectWiring
  },
  {
    fixtureId: "thick-composition-root",
    pairId: "1",
    title: "thick composition root",
    wiring: resolvedFunctionalCoreEffectWiring
  },
  {
    fixtureId: "pure-service",
    pairId: "1",
    title: "pure service candidate",
    wiring: resolvedFunctionalCoreEffectWiring
  },
  {
    fixtureId: "imperative-core",
    pairId: "1",
    title: "imperative core",
    wiring: resolvedFunctionalCoreEffectWiring
  },
  {
    fixtureId: "registration-ceremony",
    pairId: "1",
    title: "registration ceremony",
    wiring: resolvedArchitectureExploreWiring
  },
  {
    fixtureId: "hub-module",
    pairId: "1",
    title: "hub module",
    wiring: resolvedArchitectureExploreWiring
  },
  {
    fixtureId: "duplicated-orchestration",
    pairId: "1",
    title: "duplicated orchestration",
    wiring: resolvedArchitectureExploreWiring
  }
]

const reportAt = async (
  wiring: Wiring,
  projectRoot: string
): Promise<ReadonlyArray<SignalEvent>> => {
  const workspace = await Effect.runPromise(loadProject(projectRoot))
  const config = defineConfig([{ files: ["**/*"], wiring }])
  const update = new WorkspaceUpdate({
    rootPath: workspace.rootPath,
    contexts: workspace.projects.map(contextFromLoadedProject)
  })
  const events = await Effect.runPromise(
    Stream.runCollect(reportEvents(config)(Stream.succeed(update)))
  )

  return events.filter((event): event is SignalEvent => event._tag === "signal")
}

const blocksWithTitle = (
  blocks: ReadonlyArray<SignalEvent>,
  title: string
): ReadonlyArray<SignalEvent> =>
  blocks.filter((block) => block.key._tag === "advice" && block.key.title === title)

for (const exampleCase of adviceExampleCases) {
  test(`aggregate advice example: ${exampleCase.title}`, async () => {
    const exampleRoot = packageExampleRoot(exampleCase.fixtureId)
    const pairRoot = path.join(exampleRoot, exampleCase.pairId)

    const badBlocks = await reportAt(exampleCase.wiring, path.join(pairRoot, "bad"))
    const goodBlocks = await reportAt(exampleCase.wiring, path.join(pairRoot, "good"))
    const badAdvice = blocksWithTitle(badBlocks, exampleCase.title)
    const goodAdvice = blocksWithTitle(goodBlocks, exampleCase.title)
    const examples = await Effect.runPromise(loadRefactorExamplesAt(exampleRoot))
    const expectedExample = formatRefactorExample(examples[0])

    assert.equal(examples.length, 1, `${exampleCase.title} should declare exactly one fixture pair`)
    assert.ok(Array.isArray(examples), `${exampleCase.title} examples should be a concrete array`)
    assert.ok(examples.length > 0, `${exampleCase.title} examples must be non-empty`)
    assert.ok(badAdvice.length > 0, `${exampleCase.title} bad fixture should emit advice`)
    assert.equal(goodAdvice.length, 0, `${exampleCase.title} good fixture should not emit advice`)
    assert.ok(
      badAdvice.some((block) => block.text.includes(expectedExample)),
      `${exampleCase.title} advice should render its bad/good fixture pair`
    )
  })
}
