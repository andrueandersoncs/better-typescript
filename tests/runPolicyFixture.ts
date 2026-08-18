import * as path from "node:path"
import { Array, Effect } from "effect"
import type * as ts from "typescript"
import { type Detection } from "@better-typescript/core/engine/location/detectionData"
import { type Policy } from "@better-typescript/core/engine/policy/policyClass"
import { loadProject } from "@better-typescript/core/project/loadProject"
import { runPolicyOnProject } from "@better-typescript/core/project/loadProject/runPolicyOnProject"
import { compilerOptionsForPolicies } from "@better-typescript/core/engine/policy/compilerOptionsForPolicies"
import { fixturesRoot } from "./ruleTestFixturesRoot.js"

export const runPolicyFixture = async (
  named: Policy,
  compilerOptionOverrides: ts.CompilerOptions
): Promise<ReadonlyArray<Detection>> => {
  const fixturePath = path.join(fixturesRoot, named.name)
  const checkCompilerOptions = compilerOptionsForPolicies(Array.of(named))
  const compilerOptions = { ...checkCompilerOptions, ...compilerOptionOverrides }
  const workspace = await Effect.runPromise(loadProject(fixturePath, compilerOptions))

  const projectElements = await Promise.all(
    workspace.projects.map((project) => Effect.runPromise(runPolicyOnProject(named)(project)))
  )

  return projectElements.flat()
}
