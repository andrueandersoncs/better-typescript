import { makeNodeScanner } from "../scanner/makeNodeScanner.js"
import { isFunctionDefinition } from "../support/isFunctionDefinition.js"
import { functionDefinitionKinds } from "./functionDefinitionKinds.js"

export const functionDefinitionScanner =
  makeNodeScanner(functionDefinitionKinds)(isFunctionDefinition)
