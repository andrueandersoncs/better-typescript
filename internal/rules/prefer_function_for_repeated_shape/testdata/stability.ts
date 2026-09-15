declare const Service: any
declare const Result: any
declare const Factory: any
declare const Outcome: any
declare const ok: any, fail: any, good: any, bad: any

const first = Service.make({ start: 1, end: 2 }).pipe(Result.map(ok), Result.mapError(fail))
const second = Service.make({ start: 3, end: 4 }).pipe(Result.map(ok), Result.mapError(fail))
const blocker = Factory.build({ left: 5, right: 6 }).chain(Outcome.fold(good), Outcome.foldError(bad))
const third = Service.make({ start: 7, end: 8 }).pipe(Result.map(ok), Result.mapError(fail))

void first
void second
void blocker
void third
