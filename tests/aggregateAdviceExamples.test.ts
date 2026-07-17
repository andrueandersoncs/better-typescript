import * as assert from "node:assert/strict"
import * as path from "node:path"
import { test } from "node:test"
import { Effect, Stream } from "effect"
import { defaultWiring } from "@better-typescript/checks/preset/defaultWiring"
import { architectureExploreWiring } from "@better-typescript/checks/preset/architectureExploreWiring"
import { functionalCoreEffectWiring } from "@better-typescript/checks/functionalCoreEffect/wiring"
import { packageExampleRoot } from "./packageExamples.js"
import {
  directoryRefactorExamples,
  formatRefactorExample,
  makeRefactorExampleResolver
} from "@better-typescript/core/engine/example"
import type { SignalEvent } from "@better-typescript/core/engine/report/data"
import { makeReportEvents } from "@better-typescript/core/engine/watch"
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

const adviceExampleCases: ReadonlyArray<AdviceExampleCase> = [
  {
    fixtureId: "high-signal-density",
    pairId: "1",
    title: "high signal density",
    wiring: defaultWiring
  },
  {
    fixtureId: "side-effect-laundering",
    pairId: "1",
    title: "colliding fixes on shared expressions",
    wiring: defaultWiring
  },
  {
    fixtureId: "pipeline-hostile",
    pairId: "1",
    title: "pipeline-hostile module",
    wiring: defaultWiring
  },
  {
    fixtureId: "imperative-state-manager",
    pairId: "1",
    title: "imperative state manager",
    wiring: defaultWiring
  },
  {
    fixtureId: "concept-control",
    pairId: "1",
    title: "closed abstraction cluster",
    wiring: defaultWiring
  },
  {
    fixtureId: "concept-proliferation",
    pairId: "1",
    title: "concept proliferation",
    wiring: defaultWiring
  },
  {
    fixtureId: "hot-subsystem",
    pairId: "1",
    title: "hot subsystem",
    wiring: defaultWiring
  },
  {
    fixtureId: "rule-dominance",
    pairId: "1",
    title: "one rule dominates the run",
    wiring: defaultWiring
  },
  {
    fixtureId: "systemic-hotspots",
    pairId: "1",
    title: "systemic hotspots",
    wiring: defaultWiring
  },
  {
    fixtureId: "deletion-test-shallowness",
    pairId: "1",
    title: "deletion-test shallowness",
    wiring: architectureExploreWiring
  },
  {
    fixtureId: "wide-shallow-interface",
    pairId: "1",
    title: "wide shallow interface",
    wiring: architectureExploreWiring
  },
  {
    fixtureId: "bounce-cluster",
    pairId: "1",
    title: "bounce cluster",
    wiring: architectureExploreWiring
  },
  {
    fixtureId: "leaked-seam",
    pairId: "1",
    title: "leaked seam",
    wiring: architectureExploreWiring
  },
  {
    fixtureId: "test-past-interface",
    pairId: "1",
    title: "test past interface",
    wiring: architectureExploreWiring
  },
  {
    fixtureId: "hard-to-test-hotspot",
    pairId: "1",
    title: "hard-to-test hotspot",
    wiring: architectureExploreWiring
  },
  {
    fixtureId: "hypothetical-seam",
    pairId: "1",
    title: "hypothetical seam",
    wiring: architectureExploreWiring
  },
  {
    fixtureId: "effect-orchestrator",
    pairId: "1",
    title: "overgrown Effect orchestrator",
    wiring: functionalCoreEffectWiring
  },
  {
    fixtureId: "adapter-business-logic",
    pairId: "1",
    title: "business logic in an adapter",
    wiring: functionalCoreEffectWiring
  },
  {
    fixtureId: "thick-composition-root",
    pairId: "1",
    title: "thick composition root",
    wiring: functionalCoreEffectWiring
  },
  {
    fixtureId: "pure-service",
    pairId: "1",
    title: "pure service candidate",
    wiring: functionalCoreEffectWiring
  },
  {
    fixtureId: "imperative-core",
    pairId: "1",
    title: "imperative core",
    wiring: functionalCoreEffectWiring
  },
  {
    fixtureId: "registration-ceremony",
    pairId: "1",
    title: "registration ceremony",
    wiring: architectureExploreWiring
  },
  {
    fixtureId: "hub-module",
    pairId: "1",
    title: "hub module",
    wiring: architectureExploreWiring
  },
  {
    fixtureId: "duplicated-orchestration",
    pairId: "1",
    title: "duplicated orchestration",
    wiring: architectureExploreWiring
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
  const report = await Effect.runPromise(makeReportEvents(config))
  const events = await Effect.runPromise(Stream.runCollect(report(Stream.succeed(update))))

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
    const resolve = await Effect.runPromise(makeRefactorExampleResolver)
    const examples = await Effect.runPromise(resolve(directoryRefactorExamples(exampleRoot)))
    const expectedExample = formatRefactorExample(examples[0])

    assert.equal(examples.length, 1, `${exampleCase.title} should declare exactly one fixture pair`)
    assert.ok(badAdvice.length > 0, `${exampleCase.title} bad fixture should emit advice`)
    assert.equal(goodAdvice.length, 0, `${exampleCase.title} good fixture should not emit advice`)
    assert.ok(
      badAdvice.some((block) => block.text.includes(expectedExample)),
      `${exampleCase.title} advice should render its bad/good fixture pair`
    )
  })
}
