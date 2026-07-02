export {}

// Object-literal method shorthand: not a class member → not OOP coupling.
export const logger = {
  log(message: string): string {
    return message
  }
}

// Control: a class with a non-override method body still fires.
export class Recorder {
  record(entry: string): string {
    return entry
  }
}
