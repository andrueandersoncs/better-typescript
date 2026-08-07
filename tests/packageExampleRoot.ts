import * as path from "node:path"
import { packageExamplesRoot } from "./packageExamplesRoot.js"

export const packageExampleRoot = (name: string): string => path.join(packageExamplesRoot, name)
