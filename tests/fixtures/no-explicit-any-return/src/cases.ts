export {}

function functionDeclaration(): any { // ~detect 1
  return {}
}

const functionExpression = function (): Promise<any> { // ~detect 28
  return Promise.resolve({})
}

const arrowFunction = (): string | any => "value" // ~detect 23

class Service {
  methodDeclaration(): ReadonlyArray<any> { // ~detect 3
    return []
  }

  get value(): any { // ~detect 3
    return {}
  }
}

interface ServiceContract {
  methodSignature(): any // ~detect 3
}

interface CallableContract {
  (): any // ~detect 3
}

type FunctionTypeAlias = () => any // ~detect 26
