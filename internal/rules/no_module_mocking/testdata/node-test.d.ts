declare module "node:test" {
  class MockTracker {
    module(specifier: string, options?: object): void
  }
  interface TestContext {
    readonly mock: MockTracker
  }
  function test(name: string, fn: (context: TestContext) => void): void
  const mock: MockTracker
  export { mock, test, MockTracker, TestContext }
}
