export {}

function topLevelThrow(): string {
  throw "bad" // ~detect 3
}

function throwInIfBlock(cond: boolean): string {
  if (cond) {
    throw "cond failed" // ~detect 5
  }

  return "ok"
}

function throwInCatch(): string {
  try {
    void doWork()
  } catch (e) {
    throw e // ~detect 5
  }

  return "ok"
}

const throwInArrowBody = (): number => {
  throw "x" // ~detect 3
}

function doWork(): void {}
