import { readFileSync } from "node:fs"

export const configText = readFileSync("config.json", "utf8")
