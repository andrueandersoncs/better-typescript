export {}

function plainDeclaration(): string { // ~detect 1
  return "plain"
}

const expression = function (): string { // ~detect 20
  return "expression"
}

const namedExpression = function namedExpression(): string { // ~detect 25
  return "named"
}

{
  const value = function (): string { // ~detect 17
    return "nested"
  }

  void value
}
