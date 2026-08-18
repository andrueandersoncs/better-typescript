// ScanContext names the two close-brace owners because rescanning must know which one it closes.
export type ScanContext = "template" | "brace"
