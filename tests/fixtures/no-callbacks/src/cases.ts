type Handler = () => void

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

function returnsValue(callback: Handler): number {
  callback()
  return 1
}

function acceptsValue(value: string): void {
  void value
}

type FunctionTypeReturnsValue = (callback: Handler) => number

interface NonCallableValue {
  value: string
}

function acceptsNonCallableObject(input: NonCallableValue): void {
  void input
}
