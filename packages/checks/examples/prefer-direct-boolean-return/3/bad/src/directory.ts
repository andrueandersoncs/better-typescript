declare const fs: {
  readonly existsSync: (path: string) => boolean
  readonly statSync: (path: string) => { readonly isDirectory: () => boolean }
}

export const directoryExists = (absolutePath: string): boolean => {
  const exists = fs.existsSync(absolutePath)

  return exists ? fs.statSync(absolutePath).isDirectory() : false
}
