export type Ratio = {
  readonly numerator: number
  readonly denominator: number
}

export const calculateRatio = (ratio: Ratio): number => {
  return ratio.numerator / ratio.denominator
}

export const formatRatioPercent = (ratio: Ratio): string => {
  const decimal = calculateRatio(ratio)
  const percent = decimal * 100
  return `${percent.toFixed(1)}%`
}
