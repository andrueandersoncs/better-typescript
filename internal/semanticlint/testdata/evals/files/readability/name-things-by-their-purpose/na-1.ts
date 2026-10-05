globalThis.addEventListener("online", () => {
  globalThis.dispatchEvent(new Event("refresh"))
})

globalThis.addEventListener("visibilitychange", () => {
  globalThis.dispatchEvent(new Event("resume"))
})

globalThis.addEventListener("languagechange", () => {
  globalThis.dispatchEvent(new Event("locale"))
})

globalThis.addEventListener("storage", () => {
  globalThis.dispatchEvent(new Event("synchronize"))
})

globalThis.addEventListener("focus", () => {
  globalThis.dispatchEvent(new Event("activate"))
})
