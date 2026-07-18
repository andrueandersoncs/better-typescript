import { Effect, Array, Option, pipe } from "effect"
import * as path from "node:path"
import { pathToFileURL } from "node:url"
const rootDir = process.cwd()
const load = (p) => import(pathToFileURL(path.join(rootDir, p)).href)
const { loadProject } = await load("packages/core/dist/project/loadProject/loadProject.js")
const { compilerOptionsForConfig } = await load("packages/core/dist/engine/wiring/wiring.js")
const { defaultConfig } = await load("packages/checks/dist/preset/defaultWiring.js")
const { compositionFingerprints } = await load(
  "packages/checks/dist/checks/architectureExplore/compositionFingerprints.js"
)
const { makeContext } = await load("packages/core/dist/engine/sources/sources.js")
const checkMod = await load("packages/core/dist/engine/check/check.js")
console.log("checkmod", Object.keys(checkMod))
const root = path.join(rootDir, "packages/checks")
const opts = compilerOptionsForConfig(defaultConfig)
const project = await Effect.runPromise(loadProject(root, opts))
console.log("project keys", Object.keys(project), project)
