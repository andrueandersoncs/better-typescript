import * as path from "node:path"
import { fixturesRoot } from "./semanticModulePlacementFixturesRoot.js"

export const fixturePath = (name: string) => path.join(fixturesRoot, name)
