import { test } from "bun:test"
import { noUnsafeEffectApis } from "@better-typescript/guidance/preset/defaultWiring"
import { assertPolicyFixtureExpectations } from "./assertPolicyFixtureExpectations.js"
import { allowedFixtureItems } from "./noUnsafeEffectApisAllowedFixtureItems.js"
import { disallowedFixtureItems } from "./noUnsafeEffectApisDisallowedFixtureItems.js"

test("no-unsafe-effect-apis reports disallowed and permits allowed fixture items", () =>
  assertPolicyFixtureExpectations(noUnsafeEffectApis, disallowedFixtureItems, allowedFixtureItems))
