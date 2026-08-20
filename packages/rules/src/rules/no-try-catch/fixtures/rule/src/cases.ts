export {}

function tryCatch(): string {
  try { // ~detect 3
    return doWork()
  } catch (e) {
    return "failed"
  }
}

function tryFinally(): string {
  try { // ~detect 3
    return doWork()
  } finally {
    doWork()
  }
}

function tryCatchFinally(): string {
  try { // ~detect 3
    return doWork()
  } catch (e) {
    return "failed"
  } finally {
    doWork()
  }
}

const tryInArrow = (): string => {
  try { // ~detect 3
    return doWork()
  } catch (e) {
    return "failed"
  }
}

function nestedTry(): string {
  try { // ~detect 3
    try { // ~detect 5
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
