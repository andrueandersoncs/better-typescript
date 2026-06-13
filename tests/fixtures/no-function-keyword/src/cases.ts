export {}

function plainDeclaration(): string {
  return "plain"
}

const expression = function (): string {
  return "expression"
}

const namedExpression = function namedExpression(): string {
  return "named"
}

const nestedExpression = (): string => {
  const value = function (): string {
    return "nested"
  }

  return value()
}

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
