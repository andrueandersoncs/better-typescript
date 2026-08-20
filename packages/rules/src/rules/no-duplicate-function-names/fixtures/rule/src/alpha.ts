export {}

function sharedDeclaration(): void {} // ~detect 10

const sharedArrow = (): void => {} // ~detect 7

const sharedExpression = function (): void {} // ~detect 7

const crowded = (): void => {} // ~detect 7

void sharedDeclaration
void sharedArrow
void sharedExpression
void crowded
