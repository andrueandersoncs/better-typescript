declare const isEven: (n: number) => boolean

export const parityLabel = (n: number): string => {
  if (isEven(n)) {
    return "even"
  } else {
    return "odd"
  }
}
