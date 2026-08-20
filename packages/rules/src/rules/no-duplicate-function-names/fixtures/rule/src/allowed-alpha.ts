export {}

function localOverload(input: string): string
function localOverload(input: number): number
function localOverload(input: string | number): string | number {
  return input
}

function containsNested(): void {
  function sharedDeclaration(): void {}
  sharedDeclaration()
}

class AlphaService {
  sharedArrow(): void {}
}

const objectLiteral = {
  sharedExpression(): void {}
}

function valueOnly(): void {}

void localOverload
void containsNested
void objectLiteral
void valueOnly
