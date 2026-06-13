export {}

class Service {
  set value(input: any) {
    void input
  }

  preciseMethod(): Promise<unknown> {
    return Promise.resolve({})
  }
}

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
