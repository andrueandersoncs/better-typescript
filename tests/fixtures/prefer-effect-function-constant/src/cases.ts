const stableStatus = "stable"
const stableCount = 7

export const returnsString = () => "ready"
export const returnsTemplate = () => `ready`
export const returnsNumber = () => 42
export const returnsBigInt = () => 42n
export const returnsTrue = () => true
export const returnsFalse = () => false
export const returnsNull = () => null

export const blockLiteral = () => {
  return "block"
}

export const functionExpressionLiteral = function () {
  return false
}

const callbackValues = [1].map(() => "literal callback")

export const returnsStableStatus = () => stableStatus

export const returnsStableCount = function () {
  return stableCount
}

const Function = { constant: "local" }

export const returnsWithLocalFunctionBinding = () => "shadowed"

void Function
void callbackValues
