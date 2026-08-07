import * as assert from "node:assert/strict"
import { test } from "bun:test"
import { Array, Effect } from "effect"
import { makeNamedDetection } from "@better-typescript/core/engine/derive/makeNamedDetection"
import { defineConfig } from "@better-typescript/core/project/loadWiringConfig"
import { makeWiring } from "@better-typescript/core/engine/wiring/makeWiring"
import { reportEvents } from "@better-typescript/core/engine/reportPipeline"
import { WorkspaceUpdate } from "@better-typescript/core/engine/watch/data"
import { makeContext } from "@better-typescript/matchers/sources/makeContext"
import { loadFixture } from "./semanticModulePlacementReportLoadFixture.js"
import { normalizeRenderedAdvice } from "./semanticModulePlacementReportNormalizeRenderedAdvice.js"
import { placementData } from "./semanticModulePlacementReportPlacementData.js"
import { runFixturePolicy } from "./semanticModulePlacementReportRunFixturePolicy.js"
import {
  semanticModulePlacementAdvice,
  semanticModulePlacementName
} from "@better-typescript/guidance/architectureExplore/architectureExploreDerive"
test("composite Program matcher Signal adviser renderer omits raw placement blocks", async () => {
  const { workspace, policy } = await loadFixture()

  assert.equal(policy.name, semanticModulePlacementName)
  assert.equal(policy.reported, false)

  const detections = await runFixturePolicy(policy)
  const typed = Array.filterMap(detections, placementData)
  const split = Array.filter(typed, (data) => data._tag === "split-semantic-module")
  const mixed = Array.filter(typed, (data) => data._tag === "mixed-physical-module")

  assert.equal(split.length >= 1, true, "expected split-semantic-module detections")
  assert.equal(mixed.length >= 1, true, "expected mixed-physical-module detections")

  const named = detections.map(makeNamedDetection(semanticModulePlacementName))
  const advice = semanticModulePlacementAdvice(named)
  const rendered = normalizeRenderedAdvice(advice)

  assert.equal(rendered.includes(semanticModulePlacementName), false)
  assert.match(rendered, /\[file\] — mixed Physical Module/)
  assert.match(rendered, /\[file\] — split Semantic Modules/)
  assert.match(rendered, /OrderInput — type alias — src\/orders\/parse\.ts:\d+:\d+/)
  assert.match(rendered, /parseOrder — function — src\/orders\/parse\.ts:\d+:\d+/)
  assert.match(rendered, /formatOrderError — function — src\/orders\/parse\.ts:\d+:\d+/)
  assert.match(rendered, /OrderParseError — class — src\/orders\/errors\.ts:\d+:\d+/)
  assert.match(
    rendered,
    /This Physical Module contains members of \d+ Semantic Modules\. Separate the modules without splitting any membership listed below\. No destination or move direction is inferred\./
  )
  assert.match(
    rendered,
    /\d+ Semantic Modules? anchored in this Physical Module spans? multiple Physical Modules\. Place each listed Semantic Module in one Physical Module\. The anchor is only a deterministic reporting location; it is not a move recommendation\./
  )
  assert.doesNotMatch(rendered, /move to|destination path|rename to/i)

  const mixedIndex = rendered.indexOf("mixed Physical Module")
  const splitIndex = rendered.indexOf("split Semantic Modules")
  assert.equal(mixedIndex >= 0 && splitIndex > mixedIndex, true)

  const wiring = makeWiring({
    policies: [policy],
    derive: (signals) => {
      const elements = signals.flatMap((signal) =>
        signal.detections.map(makeNamedDetection(signal.name))
      )

      return semanticModulePlacementAdvice(elements)
    }
  })
  const config = defineConfig([{ files: ["**/*"], wiring }])
  const update = new WorkspaceUpdate({
    rootPath: workspace.rootPath,
    contexts: workspace.projects.map((project) => makeContext(project.rootPath)(project.program))
  })
  const events = await Effect.runPromise(reportEvents(config)(update))
  const texts = events.flatMap((event) => (event._tag === "signal" ? [event.text] : []))
  const joined = texts.join("\n")

  assert.equal(
    texts.some((text) => text.startsWith(semanticModulePlacementName)),
    false,
    "expected silent placement Signal to omit raw policy blocks"
  )
  assert.equal(joined.includes(semanticModulePlacementName), false)
  assert.match(joined, /\[file\] — mixed Physical Module/)
  assert.match(joined, /\[file\] — split Semantic Modules/)
})
