const stableStatus = "stable"
const stableCount = 7

export const returnsString = () => "ready" // ~detect 30
export const returnsTemplate = () => `ready` // ~detect 32
export const returnsNumber = () => 42 // ~detect 30
export const returnsBigInt = () => 42n // ~detect 30
export const returnsTrue = () => true // ~detect 28
export const returnsFalse = () => false // ~detect 29
export const returnsNull = () => null // ~detect 28

export const blockLiteral = () => { // ~detect 29
  return "block"
}

export const functionExpressionLiteral = function () { // ~detect 42
  return false
}

const callbackValues = [1].map(() => "literal callback") // ~detect 32

export const returnsStableStatus = () => stableStatus // ~detect 36

export const returnsStableCount = function () { // ~detect 35
  return stableCount
}

const Function = { constant: "local" }

export const returnsWithLocalFunctionBinding = () => "shadowed" // ~detect 48

void Function
void callbackValues
