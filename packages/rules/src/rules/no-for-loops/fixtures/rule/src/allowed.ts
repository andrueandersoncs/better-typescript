export {}

function loopsWithoutIteratorsAreAllowed(isReady: () => boolean): void {
  for (;;) {
    if (isReady()) {
      return
    }
  }

  for (; isReady();) {
    return
  }
}
