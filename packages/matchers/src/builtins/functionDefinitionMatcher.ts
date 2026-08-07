import { nodeMatcher } from "../matcher/nodeMatcher.js"
import { isFunctionDefinition } from "../support/isFunctionDefinition.js"
import { functionDefinitionKinds } from "./functionDefinitionKinds.js"

export const functionDefinitionMatcher = nodeMatcher(functionDefinitionKinds)(isFunctionDefinition)
