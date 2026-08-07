import { strictEqual } from "../equivalence/strictEqual.js"
import type { Advice } from "./advice.js"

export const advicePath = (advice: Advice) =>
  strictEqual("project")(advice.level) ? "project" : advice.location.path
