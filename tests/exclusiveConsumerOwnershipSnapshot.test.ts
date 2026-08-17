import * as assert from "node:assert/strict"
import * as path from "node:path"
import { test } from "bun:test"
import { Option } from "effect"
import { semanticModuleEngine } from "@better-typescript/matchers/builtins/architectureExplore/semanticModuleEngine"
import { fixtureSnapshotAt } from "./semanticModulesFixtureSnapshotAt.js"
import { semanticModulesEntityKeyNamed } from "./semanticModulesEntityKeyNamed.js"
import { neutralReferenceCatalog } from "./semanticModulesNeutralReferenceCatalog.js"

test("static catalog aggregation stays outside ownership membership and proofs", async () => {
  const fixturePath = path.join(import.meta.dir, "fixtures", "exclusive-consumer-static-catalog")
  const snapshot = await fixtureSnapshotAt(fixturePath, false, () => true, neutralReferenceCatalog)
  const reversed = await fixtureSnapshotAt(fixturePath, true, () => true, neutralReferenceCatalog)
  const catalog = semanticModulesEntityKeyNamed("entryCatalog")(snapshot)
  const propertyCatalog = semanticModulesEntityKeyNamed("EntryCatalog")(snapshot)
  const firstEntry = semanticModulesEntityKeyNamed("firstEntry")(snapshot)
  const secondEntry = semanticModulesEntityKeyNamed("secondEntry")(snapshot)

  assert.deepEqual(snapshot.acceptedBonds, [])
  assert.equal(snapshot.modules.length, 4)
  assert.equal(
    Option.isNone(semanticModuleEngine.proofBetween(catalog, firstEntry)(snapshot)),
    true
  )
  assert.equal(
    Option.isNone(semanticModuleEngine.proofBetween(catalog, secondEntry)(snapshot)),
    true
  )
  assert.equal(
    Option.isNone(semanticModuleEngine.proofBetween(propertyCatalog, firstEntry)(snapshot)),
    true
  )
  assert.equal(
    Option.isNone(semanticModuleEngine.proofBetween(propertyCatalog, secondEntry)(snapshot)),
    true
  )
  assert.equal(JSON.stringify(reversed), JSON.stringify(snapshot))
})
