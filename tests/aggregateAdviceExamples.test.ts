import * as assert from "node:assert/strict"
import * as path from "node:path"
import { test } from "node:test"
import { Effect } from "effect"
import { defaultWiring } from "@better-typescript/checks/preset/defaultWiring"
import { architectureExploreWiring } from "@better-typescript/checks/preset/architectureExploreWiring"
import {
  fixtureExampleRoot,
  fixtureRefactorExamples
} from "@better-typescript/checks/fixtureExamples"
import { formatRefactorExample } from "@better-typescript/core/engine/example"
import { defineConfig } from "@better-typescript/core/engine/report"
import type { ReportBlock, Wiring } from "@better-typescript/core/engine/report/data"
import { loadProject, reportBlocksFromConfig } from "@better-typescript/core/project/loadProject"

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
  }
]

const reportAt = async (
  wiring: Wiring,
  projectRoot: string
): Promise<ReadonlyArray<ReportBlock>> => {
  const workspace = await Effect.runPromise(loadProject(projectRoot))
  const config = defineConfig([{ files: ["**/*"], wiring }])

  return Effect.runPromise(reportBlocksFromConfig(config)(workspace))
}

const blocksWithTitle = (
  blocks: ReadonlyArray<ReportBlock>,
  title: string
): ReadonlyArray<ReportBlock> =>
  blocks.filter((block) => block.key._tag === "advice" && block.key.title === title)

for (const exampleCase of adviceExampleCases) {
  test(`aggregate advice example: ${exampleCase.title}`, async () => {
    const pairRoot = path.join(fixtureExampleRoot(exampleCase.fixtureId), exampleCase.pairId)

    const badBlocks = await reportAt(exampleCase.wiring, path.join(pairRoot, "bad"))
    const goodBlocks = await reportAt(exampleCase.wiring, path.join(pairRoot, "good"))
    const badAdvice = blocksWithTitle(badBlocks, exampleCase.title)
    const goodAdvice = blocksWithTitle(goodBlocks, exampleCase.title)
    const examples = fixtureRefactorExamples(exampleCase.fixtureId)
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
