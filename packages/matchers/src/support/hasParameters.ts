import type { FunctionInitializer } from "./functionInitializer.js"

export const hasParameters = (initializer: FunctionInitializer) => initializer.parameters.length > 0
