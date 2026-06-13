export {}

function functionDeclaration(): any {
  return {}
}

const functionExpression = function (): Promise<any> {
  return Promise.resolve({})
}

const arrowFunction = (): string | any => "value"

class Service {
  methodDeclaration(): ReadonlyArray<any> {
    return []
  }

  get value(): any {
    return {}
  }
}

interface ServiceContract {
  methodSignature(): any
}

interface CallableContract {
  (): any
}

type FunctionTypeAlias = () => any
