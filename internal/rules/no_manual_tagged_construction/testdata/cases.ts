declare const Match: { when: (pattern: object, handler: unknown) => unknown }
const invalid = { _tag: "Ready", value: 1 }
Match.when({ _tag: "Ready" }, () => undefined)
void invalid
