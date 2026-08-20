export {}

const nestedExpression = (): string => "nested"

function overload(value: string): string
function overload(value: number): string
function overload(value: string | number): string {
  return String(value)
}

function* generatorDeclaration(): Generator<number, void, unknown> {
  yield 1
}

const generatorExpression = function* (): Generator<number, void, unknown> {
  yield 1
}

const arrowFunction = (): string => "arrow"

class Service {
  methodDeclaration(): string {
    return "method"
  }
}
