export const TIMEOUT = Symbol('timeout')

export function createClock(timeMs) {
  const end = performance.now() + timeMs
  return {
    check() {
      if (performance.now() >= end) throw TIMEOUT
    },
  }
}
