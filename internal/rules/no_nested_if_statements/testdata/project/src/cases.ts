declare const a: boolean, b: boolean
if (a) {
 if (b) console.log("violation")
}
if (a) console.log("clean")
if (a) console.log("chain")
else if (b) console.log("chain clean")
else console.log("chain end")
if (a) console.log("two-way")
else {
 if (b) console.log("else block violation")
}
if (a) {
 [1].forEach(() => {
  if (b) console.log("callback violation")
 })
}
function guards(): void {
 if (a) return
 if (b) return
}
