import { catalog } from "./entries.js"
import { registryName } from "./config.js"

export const registry = {
  name: registryName,
  entries: catalog()
}
