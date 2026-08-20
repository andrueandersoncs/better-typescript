import type { Handler } from "./shared.js"

function functionDeclaration(callback: Handler): void { // ~detect 1
  callback()
}

const functionExpression = function (callback: Handler): void { // ~detect 28
  callback()
}

const arrowFunction = (callback: Handler): void => { // ~detect 23
  callback()
}

class Service {
  methodDeclaration(callback: Handler): void { // ~detect 3
    callback()
  }
}

interface ServiceContract {
  methodSignature(callback: Handler): void // ~detect 3
}

interface CallableContract {
  (callback: Handler): void // ~detect 3
}

type FunctionTypeAlias = (callback: Handler) => void // ~detect 26

declare const callbackImplementation: FunctionTypeAlias
const functionTypeValue: (callback: Handler) => void = callbackImplementation // ~detect 26
