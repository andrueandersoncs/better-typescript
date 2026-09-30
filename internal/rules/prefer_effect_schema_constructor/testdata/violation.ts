function makeUser() {
  return { _tag: "User", name: "Ada" }
}

function makeQuoted() {
  return { "_tag": "Quoted", value: 1 }
}

function makeComputed() {
  return { ["_tag"]: "Computed", value: 1 }
}

function makeEmptyTag() {
  return { _tag: "", value: 1 }
}

function makeLocal() {
  const event = { _tag: "Selected", value: 1 }
  return event
}

function makeString(): String { return {} }
