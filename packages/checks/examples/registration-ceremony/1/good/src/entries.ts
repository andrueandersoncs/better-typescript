export type Entry = {
  readonly id: string
  readonly label: string
}

export const entry = (id: string, label: string): Entry => ({ id, label })

export const catalog = (): ReadonlyArray<Entry> => [
  entry("a", "alpha"),
  entry("b", "beta"),
  entry("c", "gamma"),
  entry("d", "delta"),
  entry("e", "epsilon"),
  entry("f", "zeta"),
  entry("g", "eta"),
  entry("h", "theta"),
  entry("i", "iota"),
  entry("j", "kappa"),
  entry("k", "lambda"),
  entry("l", "mu"),
  entry("m", "nu"),
  entry("n", "xi"),
  entry("o", "omicron"),
  entry("p", "pi")
]
