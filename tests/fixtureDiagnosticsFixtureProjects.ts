import * as fs from "node:fs"
import * as path from "node:path"
import { fileURLToPath } from "node:url"
import type { FixtureProject } from "./fixtureDiagnosticsFixtureProject.js"

const testDirectory = path.dirname(fileURLToPath(import.meta.url))
const fixturesRoot = path.join(testDirectory, "fixtures")

export const fixtureProjects: ReadonlyArray<FixtureProject> = fs
  .readdirSync(fixturesRoot, { withFileTypes: true })
  .filter((entry) => entry.isDirectory())
  .map((entry) => ({
    label: entry.name,
    projectPath: path.join(fixturesRoot, entry.name)
  }))
  .sort((left, right) => left.label.localeCompare(right.label))
