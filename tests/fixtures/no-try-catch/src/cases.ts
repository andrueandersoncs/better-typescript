export {}

function tryCatch(): string {
  try {
    return doWork()
  } catch (e) {
    return "failed"
  }
}

function tryFinally(): string {
  try {
    return doWork()
  } finally {
    doWork()
  }
}

function tryCatchFinally(): string {
  try {
    return doWork()
  } catch (e) {
    return "failed"
  } finally {
    doWork()
  }
}

const tryInArrow = (): string => {
  try {
    return doWork()
  } catch (e) {
    return "failed"
  }
}

function nestedTry(): string {
  try {
    try {
      return doWork()
    } catch (inner) {
      return "inner"
    }
  } catch (outer) {
    return "outer"
  }
}

function doWork(): string {
  return "ok"
}
