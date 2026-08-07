import { type Policy } from "@better-typescript/core/engine/policy/policyClass"
import { assertAllowedFixtureItems } from "./assertAllowedFixtureItems.js"
import { assertDisallowedFixtureItems } from "./assertDisallowedFixtureItems.js"
import type { ExpectedDetection } from "./expectedDetection.js"
import type { FixtureItem } from "./fixtureItem.js"
import { runPolicyFixture } from "./runPolicyFixture.js"

export const assertPolicyFixtureExpectations = async (
  named: Policy,
  disallowed: ReadonlyArray<ExpectedDetection>,
  allowed: ReadonlyArray<FixtureItem> = []
): Promise<void> => {
  const elements = await runPolicyFixture(named, {})

  assertDisallowedFixtureItems(elements, disallowed)

  if (allowed.length > 0) {
    assertAllowedFixtureItems(elements, allowed)
  }
}
