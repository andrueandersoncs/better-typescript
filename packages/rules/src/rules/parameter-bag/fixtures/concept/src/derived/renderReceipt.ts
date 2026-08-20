import type { RenderReceiptInput } from "./data.js"

const renderReceipt = (input: RenderReceiptInput): string =>
  input.receiptIdentifier

const firstRenderer = renderReceipt
const secondRenderer = renderReceipt

void firstRenderer
void secondRenderer
