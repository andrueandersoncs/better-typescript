class Local {}
declare const value: unknown
if (value instanceof Local) console.log("violation")
if (value === null) console.log("clean")
