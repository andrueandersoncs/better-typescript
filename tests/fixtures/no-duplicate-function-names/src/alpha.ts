export {}

function sharedDeclaration(): void {}

const sharedArrow = (): void => {}

const sharedExpression = function (): void {}

const crowded = (): void => {}

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

void sharedDeclaration
void sharedArrow
void sharedExpression
void crowded
void localOverload
void containsNested
void objectLiteral
void valueOnly
