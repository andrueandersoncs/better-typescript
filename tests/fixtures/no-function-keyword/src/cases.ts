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

{
  const value = function (): string {
    return "nested"
  }

  void value
}
