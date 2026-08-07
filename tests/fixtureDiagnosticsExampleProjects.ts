import { packageExamplesRoot } from "./packageExamplesRoot.js"
import * as fs from "node:fs"
import * as path from "node:path"
import type { FixtureProject } from "./fixtureDiagnosticsFixtureProject.js"

export const exampleProjects = (): ReadonlyArray<FixtureProject> => {
  if (!fs.existsSync(packageExamplesRoot)) {
    return []
  }

  const projects: Array<FixtureProject> = []

  for (const checkEntry of fs.readdirSync(packageExamplesRoot, { withFileTypes: true })) {
    if (!checkEntry.isDirectory()) {
      continue
    }

    const checkRoot = path.join(packageExamplesRoot, checkEntry.name)

    for (const pairEntry of fs.readdirSync(checkRoot, { withFileTypes: true })) {
      if (!pairEntry.isDirectory()) {
        continue
      }

      const pairRoot = path.join(checkRoot, pairEntry.name)

      for (const side of ["bad", "good"] as const) {
        const sideRoot = path.join(pairRoot, side)
        const tsconfigPath = path.join(sideRoot, "tsconfig.json")

        if (fs.existsSync(tsconfigPath)) {
          projects.push({
            label: `examples/${checkEntry.name}/${pairEntry.name}/${side}`,
            projectPath: sideRoot
          })
        }
      }
    }
  }

  return projects.sort((left, right) => left.label.localeCompare(right.label))
}
