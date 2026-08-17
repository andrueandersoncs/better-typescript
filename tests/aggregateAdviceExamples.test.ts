import * as assert from "node:assert/strict"
import * as path from "node:path"
import { test } from "bun:test"
import { packageExampleRoot } from "./packageExampleRoot.js"
import { adviceExampleCases } from "./adviceExampleCases.js"
import { reportAt } from "./aggregateAdviceReportAt.js"
import { blocksWithTitle } from "./blocksWithTitle.js"

for (const exampleCase of adviceExampleCases) {
  test(`aggregate advice example: ${exampleCase.title}`, async () => {
    const exampleRoot = packageExampleRoot(exampleCase.fixtureId)
    const pairRoot = path.join(exampleRoot, exampleCase.pairId)

    const badBlocks = await reportAt(exampleCase.wiring, path.join(pairRoot, "bad"))
    const goodBlocks = await reportAt(exampleCase.wiring, path.join(pairRoot, "good"))
    const badAdvice = blocksWithTitle(badBlocks, exampleCase.title)
    const goodAdvice = blocksWithTitle(goodBlocks, exampleCase.title)
    assert.equal(
      exampleCase.pairId,
      "1",
      `${exampleCase.title} should declare exactly one fixture pair`
    )
    assert.ok(badAdvice.length > 0, `${exampleCase.title} bad fixture should emit advice`)
    assert.equal(goodAdvice.length, 0, `${exampleCase.title} good fixture should not emit advice`)
    assert.ok(
      badAdvice.some((block) => block.text.includes("  Bad (") && block.text.includes("  Good (")),
      `${exampleCase.title} advice should render its bad/good fixture pair`
    )
  })
}
