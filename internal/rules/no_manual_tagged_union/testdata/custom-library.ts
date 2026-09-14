namespace Workflow {
  type State = Readonly<{ readonly _tag: "A" }> | Readonly<{ readonly _tag: "B" }>
}
