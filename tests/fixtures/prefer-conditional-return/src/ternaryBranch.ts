export const pick = (flag: boolean, n: number): string => {
  if (flag) {
    return n > 0 ? "pos" : "non-pos"
  }
  return "off"
}

export const label = (on: boolean): string => {
  if (on) { // ~detect 3
    return "on"
  } else {
    return "off"
  }
}
