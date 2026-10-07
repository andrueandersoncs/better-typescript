type Percentage = {
  readonly basisPoints: number
}

export const fractionForPercentage = (percentage: Percentage): number =>
  percentage.basisPoints / 10_000

export const percentageLabel = (percentage: Percentage): string =>
  `${percentage.basisPoints}bp`

export const combinePercentages = (
  first: Percentage,
  second: Percentage,
): Percentage => ({ basisPoints: first.basisPoints + second.basisPoints })
