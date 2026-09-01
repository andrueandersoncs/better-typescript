import { cp, mkdir } from "node:fs/promises"
import { dirname, resolve } from "node:path"
import { fileURLToPath } from "node:url"

const skillRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..")
const destination = resolve(process.argv[2])

await mkdir(dirname(destination), { recursive: true })
await cp(resolve(skillRoot, "assets/story-test-template"), destination, {
  recursive: true,
  filter: (source) => !source.includes("node_modules") && !source.includes(`${resolve(skillRoot, "assets/story-test-template")}/dist`),
})
console.log(destination)
