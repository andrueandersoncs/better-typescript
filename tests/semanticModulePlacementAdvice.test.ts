import * as assert from "node:assert/strict"
import { test } from "bun:test"
import { adviceText } from "@better-typescript/core/engine/reportPipeline"
import { makeNamedDetection } from "@better-typescript/core/engine/derive/makeNamedDetection"
import { Detection } from "@better-typescript/core/engine/location/detectionData"
import { Location } from "@better-typescript/core/engine/location/locationData"
import { semanticModulePlacementAdvice } from "@better-typescript/guidance/architectureExplore/architectureExploreDerive"
import { adviceByTitle } from "./semanticModulePlacementAdviceByTitle.js"
import { emptyExamples } from "./semanticModulePlacementAdviceEmptyExamples.js"
import { measureCount } from "./semanticModulePlacementAdviceMeasureCount.js"
import { mixedData } from "./semanticModulePlacementAdviceMixedData.js"
import { orderInput, orderInputModule } from "./semanticModulePlacementAdviceOrderInput.js"
import { parseOrder } from "./semanticModulePlacementAdviceParseOrder.js"
import { parseOrderModule } from "./semanticModulePlacementAdviceParseOrderModule.js"
import { placementElement } from "./semanticModulePlacementAdvicePlacementElement.js"
import { slice } from "./semanticModulePlacementAdviceSlice.js"
import { splitData } from "./semanticModulePlacementAdviceSplitData.js"
import { formatOrderError } from "./semanticModulePlacementAdviceFormatOrderError.js"
import { orderParseError } from "./semanticModulePlacementAdviceOrderParseError.js"
import { entity } from "./semanticModulePlacementAdviceEntity.js"
import { MixedPhysicalModulePlacementData } from "@better-typescript/matchers/builtins/architectureExplore/semanticModulePlacementMixedData.js"
import { SplitSemanticModulePlacementData } from "@better-typescript/matchers/builtins/architectureExplore/semanticModulePlacementSplitData.js"

test("mixed advice emits once per mixed file with complete membership rows", () => {
  const elements = [
    placementElement("src/orders/parse.ts", 1, 1, mixedData),
    placementElement("src/orders/parse.ts", 1, 1, mixedData)
  ]

  const advice = semanticModulePlacementAdvice(elements)
  const mixed = adviceByTitle(advice, "mixed Physical Module")

  assert.equal(mixed.length, 1)
  assert.equal(mixed[0]?.level, "file")
  assert.equal(mixed[0]?.location.path, "src/orders/parse.ts")
  assert.equal(measureCount(mixed[0]!, "code-entities-here"), 3)
  assert.equal(measureCount(mixed[0]!, "semantic-modules"), 2)
  assert.match(
    mixed[0]!.remediation,
    /This Physical Module contains members of 2 Semantic Modules\. Separate the modules without splitting any membership listed below\. No destination or move direction is inferred\./
  )
  assert.match(mixed[0]!.remediation, /No destination or move direction is inferred/)
  assert.doesNotMatch(mixed[0]!.remediation, /move to|destination path|rename to/i)
  assert.match(
    mixed[0]!.remediation,
    /Semantic Module anchored at src\/orders\/parse\.ts:8:1\n    - OrderInput — type alias — src\/orders\/parse\.ts:8:1/
  )
  assert.match(
    mixed[0]!.remediation,
    /Semantic Module anchored at src\/orders\/parse\.ts:14:1\n    - parseOrder — function — src\/orders\/parse\.ts:14:1\n    - formatOrderError — function — src\/orders\/parse\.ts:31:1\n    - OrderParseError — class — src\/orders\/errors\.ts:4:1/
  )
})

test("split advice groups by anchor file with singular remediation and physical paths", () => {
  const elements = [
    placementElement("src/orders/parse.ts", 14, 1, splitData),
    placementElement("src/orders/parse.ts", 14, 1, splitData)
  ]

  const advice = semanticModulePlacementAdvice(elements)
  const split = adviceByTitle(advice, "split Semantic Modules")

  assert.equal(split.length, 1)
  assert.equal(split[0]?.level, "file")
  assert.equal(split[0]?.location.path, "src/orders/parse.ts")
  assert.equal(measureCount(split[0]!, "code-entities"), 3)
  assert.equal(measureCount(split[0]!, "physical-modules"), 2)
  assert.equal(measureCount(split[0]!, "split-semantic-modules"), 1)
  assert.match(
    split[0]!.remediation,
    /^1 Semantic Module anchored in this Physical Module spans multiple Physical Modules\. Place each listed Semantic Module in one Physical Module\. The anchor is only a deterministic reporting location; it is not a move recommendation\./
  )
  assert.match(
    split[0]!.remediation,
    /Current Physical Modules\n    - src\/orders\/errors\.ts\n    - src\/orders\/parse\.ts/
  )
  assert.doesNotMatch(split[0]!.remediation, /move to|destination path|rename to/i)
})

test("split advice uses plural remediation for multiple modules at one anchor file", () => {
  const secondSplit = entity({
    path: "src/orders/parse.ts",
    start: 400,
    end: 450,
    syntaxKind: 259,
    displayName: "serializeOrder",
    declarationKind: "FunctionDeclaration",
    line: 40,
    column: 1
  })
  const remoteHelper = entity({
    path: "src/orders/errors.ts",
    start: 120,
    end: 160,
    syntaxKind: 259,
    displayName: "helper",
    declarationKind: "FunctionDeclaration",
    line: 12,
    column: 1
  })
  const secondModule = slice(
    [secondSplit, remoteHelper],
    ["src/orders/errors.ts", "src/orders/parse.ts"]
  )
  const secondSplitData = SplitSemanticModulePlacementData.make({ modules: [secondModule] })

  const elements = [
    placementElement("src/orders/parse.ts", 14, 1, splitData),
    placementElement("src/orders/parse.ts", 40, 1, secondSplitData)
  ]

  const advice = semanticModulePlacementAdvice(elements)
  const split = adviceByTitle(advice, "split Semantic Modules")

  assert.equal(split.length, 1)
  assert.equal(measureCount(split[0]!, "split-semantic-modules"), 2)
  assert.match(
    split[0]!.remediation,
    /^2 Semantic Modules anchored in this Physical Module span multiple Physical Modules\./
  )
  assert.match(split[0]!.remediation, /Semantic Module anchored at src\/orders\/parse\.ts:14:1/)
  assert.match(split[0]!.remediation, /Semantic Module anchored at src\/orders\/parse\.ts:40:1/)
})

test("mixed precedes split at one file and overlap never suppresses either mismatch", () => {
  const elements = [
    placementElement("src/orders/parse.ts", 14, 1, splitData),
    placementElement("src/orders/parse.ts", 1, 1, mixedData)
  ]

  const advice = semanticModulePlacementAdvice(elements)

  assert.deepEqual(
    advice.map((item) => item.title),
    ["mixed Physical Module", "split Semantic Modules"]
  )
  assert.equal(
    advice.every((item) => item.location.path === "src/orders/parse.ts"),
    true
  )
})

test("advice preserves canonical module, member, and path ordering", () => {
  const reverseMixed = MixedPhysicalModulePlacementData.make({
    physicalModulePath: "src/orders/parse.ts",
    modules: [parseOrderModule, orderInputModule]
  })
  const reversePaths = slice(
    [parseOrder, formatOrderError, orderParseError],
    ["src/orders/parse.ts", "src/orders/errors.ts"]
  )
  const reverseSplit = SplitSemanticModulePlacementData.make({ modules: [reversePaths] })

  const elements = [
    placementElement("src/orders/parse.ts", 1, 1, reverseMixed),
    placementElement("src/orders/parse.ts", 14, 1, reverseSplit)
  ]

  const advice = semanticModulePlacementAdvice(elements)
  const mixed = adviceByTitle(advice, "mixed Physical Module")[0]!
  const split = adviceByTitle(advice, "split Semantic Modules")[0]!

  const mixedAnchors = [...mixed.remediation.matchAll(/Semantic Module anchored at ([^\n]+)/g)].map(
    (match) => match[1]
  )
  assert.deepEqual(mixedAnchors, ["src/orders/parse.ts:8:1", "src/orders/parse.ts:14:1"])

  assert.match(
    split.remediation,
    /Current Physical Modules\n    - src\/orders\/errors\.ts\n    - src\/orders\/parse\.ts/
  )
})

test("normalized renderer matches representative mixed and split contract", () => {
  const elements = [
    placementElement("src/orders/parse.ts", 1, 1, mixedData),
    placementElement("src/orders/parse.ts", 14, 1, splitData)
  ]

  const advice = semanticModulePlacementAdvice(elements)
  const rendered = advice.map((item) => adviceText(emptyExamples)(item)).join("\n\n")

  assert.equal(
    rendered,
    [
      "src/orders/parse.ts [file] — mixed Physical Module",
      "  fix: This Physical Module contains members of 2 Semantic Modules. Separate the modules without splitting any membership listed below. No destination or move direction is inferred.",
      "",
      "  Semantic Module anchored at src/orders/parse.ts:8:1",
      "    - OrderInput — type alias — src/orders/parse.ts:8:1",
      "",
      "  Semantic Module anchored at src/orders/parse.ts:14:1",
      "    - parseOrder — function — src/orders/parse.ts:14:1",
      "    - formatOrderError — function — src/orders/parse.ts:31:1",
      "    - OrderParseError — class — src/orders/errors.ts:4:1",
      "  evidence: code-entities-here: 3",
      "  evidence: semantic-modules: 2",
      "",
      "src/orders/parse.ts [file] — split Semantic Modules",
      "  fix: 1 Semantic Module anchored in this Physical Module spans multiple Physical Modules. Place each listed Semantic Module in one Physical Module. The anchor is only a deterministic reporting location; it is not a move recommendation.",
      "",
      "  Semantic Module anchored at src/orders/parse.ts:14:1",
      "    - parseOrder — function — src/orders/parse.ts:14:1",
      "    - formatOrderError — function — src/orders/parse.ts:31:1",
      "    - OrderParseError — class — src/orders/errors.ts:4:1",
      "",
      "  Current Physical Modules",
      "    - src/orders/errors.ts",
      "    - src/orders/parse.ts",
      "  evidence: code-entities: 3",
      "  evidence: physical-modules: 2",
      "  evidence: split-semantic-modules: 1"
    ].join("\n")
  )
})

test("adviser ignores non-placement detections", () => {
  const other = makeNamedDetection("module-graph")(
    Detection.make({
      location: Location.make({ path: "src/orders/parse.ts", line: 1, column: 1 }),
      message: "other",
      hint: "other"
    })
  )

  assert.deepEqual(semanticModulePlacementAdvice([other]), [])
})
