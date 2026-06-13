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

  set value(input: any) {
    void input
  }

  preciseMethod(): Promise<unknown> {
    return Promise.resolve({})
  }
}

interface ServiceContract {
  methodSignature(): any
}

interface CallableContract {
  (): any
}

type FunctionTypeAlias = () => any

function preciseReturn(): unknown {
  return {}
}

function inferredReturn() {
  return {} as any
}

function parameterOnly(value: any): string {
  return String(value)
}

type AnyAlias = any

function aliasReturn(): AnyAlias {
  return {}
}
