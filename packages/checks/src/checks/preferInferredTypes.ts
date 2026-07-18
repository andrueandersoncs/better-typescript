import { makePlannedCheck } from "../defineCheck.js"
import { inferredTypePlan } from "./support/inferredTypes.js"

const checkName = "prefer-inferred-types"

export const preferInferredTypes = makePlannedCheck(checkName, inferredTypePlan)
