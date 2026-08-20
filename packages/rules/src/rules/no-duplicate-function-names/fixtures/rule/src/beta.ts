export {}

function sharedDeclaration(): void {} // ~detect 10

const sharedArrow = function (): void {} // ~detect 7

const crowded = function (): void {} // ~detect 7

void sharedDeclaration
void sharedArrow
void crowded
