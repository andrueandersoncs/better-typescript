declare const compile: any
declare const registry: any

const first = compile(registry, { pattern: /one+/, primary: "a", secondary: "a" }, registry.finalize())
const second = compile(registry, { pattern: /two{2}/, primary: "b", secondary: "c" }, registry.finalize())
const third = compile(registry, { pattern: /three|four/, primary: "d", secondary: "e" }, registry.finalize())

void first
void second
void third
