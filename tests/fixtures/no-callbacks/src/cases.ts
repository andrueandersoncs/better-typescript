import type { Handler } from "./shared.js"

function functionDeclaration(callback: Handler): void {
  callback()
}

const functionExpression = function (callback: Handler): void {
  callback()
}

const arrowFunction = (callback: Handler): void => {
  callback()
}

class Service {
  methodDeclaration(callback: Handler): void {
    callback()
  }
}

interface ServiceContract {
  methodSignature(callback: Handler): void
}

interface CallableContract {
  (callback: Handler): void
}

type FunctionTypeAlias = (callback: Handler) => void

declare const callbackImplementation: FunctionTypeAlias
const functionTypeValue: (callback: Handler) => void = callbackImplementation
