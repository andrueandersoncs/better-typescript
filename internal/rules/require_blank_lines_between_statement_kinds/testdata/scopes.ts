namespace Scope {
  export const value = 1
  export class Item {}
}

function blocks(flag: number) {
  {
    const value = 1
    void value
  }

  switch (flag) {
    case 1:
      console.log(flag)
      break
    default:
      const value = 2
      return value
  }
}
