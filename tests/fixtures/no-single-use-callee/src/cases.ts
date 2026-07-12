export {}

// Single-use callee: arrow, called once directly
const isPositive = (n: number): boolean => n > 0

const validateAge = (age: number): boolean => isPositive(age)

// Single-use callee: multi-line arrow, called once directly
const extractName = (user: { name: string; age: number }): string => {
  const trimmed = user.name.trim()

  return trimmed.toLowerCase()
}

const formatUser = (user: { name: string; age: number }): string =>
  extractName(user) + " (" + user.age + ")"

// Single-use callee: function declaration, called once directly
function computeArea(radius: number): number {
  return Math.PI * radius * radius
}

const circleDescription = (radius: number): string =>
  "area=" + computeArea(radius)

// Single-use callee: curried arrow, called once directly
const isLessThan =
  (threshold: number) =>
  (value: number): boolean =>
    value < threshold

const belowTwo = [1, 2, 3].filter(isLessThan(2))

void validateAge
void formatUser
void circleDescription
void belowTwo
