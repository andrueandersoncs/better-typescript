export const freeze = <A extends object>(value: A): A => {
  const frozenValue = Object.freeze(value)
  return frozenValue
}
