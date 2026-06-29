export {}

// Allowed: curried function (returns another function)
const isGreaterThan =
  (threshold: number) =>
  (value: number): boolean =>
    value > threshold

const filtered = [1, 2, 3].filter(isGreaterThan(2))

// Allowed: exported function (may be used externally)
export const formatCurrency = (amount: number): string =>
  "$" + amount.toFixed(2)

const receipt = formatCurrency(42)

// Allowed: function called in multiple places
const double = (n: number): number => n * 2

const a = double(5)
const b = double(10)

// Allowed: function passed as argument (value position)
const isEven = (n: number): boolean => n % 2 === 0

const evens = [1, 2, 3, 4].filter(isEven)

// Allowed: function used as object property value (value position)
const greet = (name: string): string => "hello " + name

const handlers = { greet }

// Allowed: function assigned to a variable (value position)
const transform = (s: string): string => s.toUpperCase()

const fn = transform

// Allowed: function with zero references (dead code, not this rule's concern)
const unused = (x: number): number => x + 1

void filtered
void receipt
void a
void b
void evens
void handlers
void fn
