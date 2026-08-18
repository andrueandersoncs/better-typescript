import { nodeScanner } from "../scanner/nodeScanner.js"
import { isFunctionDefinition } from "../support/isFunctionDefinition.js"
import { functionDefinitionKinds } from "./functionDefinitionKinds.js"

export const functionDefinitionScanner = nodeScanner(functionDefinitionKinds)(isFunctionDefinition)
