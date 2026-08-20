export {}

const alreadyImplicit = (n: number): number => n * 2

const multiStatement = (n: number): number => {
  const next = n + 1
  return next
}

const nonReturnStatement = (log: (value: string) => void): void => {
  log("hit")
}

const bareReturn = (): void => {
  return
}

function functionDeclaration(n: number): number {
  return n * 3
}

const emptyBlock = (): void => {}
