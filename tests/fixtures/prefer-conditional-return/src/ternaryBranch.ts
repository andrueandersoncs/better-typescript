export const pick = (flag: boolean, n: number): string => {
  if (flag) {
    return n > 0 ? "pos" : "non-pos"
  }
  return "off"
}

export const label = (on: boolean): string => {
  if (on) {
    return "on"
  } else {
    return "off"
  }
}
