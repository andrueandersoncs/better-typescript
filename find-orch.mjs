import { Effect, Array, Option, pipe } from "effect"
import * as path from "node:path"
import { pathToFileURL } from "node:url"
const rootDir = process.cwd()
const load = (p) => import(pathToFileURL(path.join(rootDir, p)).href)
const { loadProject } = await load("packages/core/dist/project/loadProject/loadProject.js")
const { compilerOptionsForConfig } = await load("packages/core/dist/engine/wiring/wiring.js")
const { defaultConfig } = await load("packages/guidance/dist/preset/defaultWiring.js")
const { compositionFingerprints } = await load(
  "packages/guidance/dist/policies/compositionFingerprints.js"
)
const { makeContext } = await load("packages/matchers/dist/sources/sources.js")
const policyMod = await load("packages/core/dist/engine/policy/policy.js")
console.log("policymod", Object.keys(policyMod))
const root = path.join(rootDir, "packages/guidance")
const opts = compilerOptionsForConfig(defaultConfig)
const project = await Effect.runPromise(loadProject(root, opts))
console.log("project keys", Object.keys(project), project)
