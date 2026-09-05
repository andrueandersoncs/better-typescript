export function* values(): Generator<number, void, unknown> {
  yield 1
}

export function overloaded(value: string): string
export function overloaded(value: number): number
export function overloaded(value: string | number): string | number {
  return value
}

export const readsThis = function(this: { readonly value: number }) {
  return () => this.value
}

export const readsArguments = function() {
  return () => arguments.length
}

export const readsTarget = function() {
  return () => new.target
}

export const propertyNamedArguments = function() {
  return { arguments: 1 }.arguments
}

export const capturesShorthandArguments = function() {
  return { arguments }
}

export const capturesComputedArguments = function() {
  return { [arguments[0]]() {} }
}

export const capturesHeritageArguments = function() {
  return class extends arguments[0] {}
}
