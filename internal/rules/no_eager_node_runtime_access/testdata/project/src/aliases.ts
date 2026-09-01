import { existsSync as fileExists } from "fs"
import { readFile as readFileLegacy } from "fs/promises"
import { readFile as readFileNode } from "node:fs/promises"
import { tmpdir as temporaryDirectory } from "os"

const exists = fileExists("fixture.txt")
const legacyContents = readFileLegacy("fixture.txt", "utf8")
const nodeContents = readFileNode("fixture.txt", "utf8")
const directory = temporaryDirectory()
void exists
void legacyContents
void nodeContents
void directory
