export {}

function topLevelThrow(): string {
  throw "bad"
}

function throwInIfBlock(cond: boolean): string {
  if (cond) {
    throw "cond failed"
  }

  return "ok"
}

function throwInCatch(): string {
  try {
    void doWork()
  } catch (e) {
    throw e
  }

  return "ok"
}

const throwInArrowBody = (): number => {
  throw "x"
}

function doWork(): void {}
