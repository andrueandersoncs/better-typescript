import { definePlannedCheck } from "../defineCheck.js"
import { inferredTypePlan } from "./support/inferredTypes.js"

const checkName = "prefer-inferred-types"

export const preferInferredTypes = definePlannedCheck(checkName, inferredTypePlan)
