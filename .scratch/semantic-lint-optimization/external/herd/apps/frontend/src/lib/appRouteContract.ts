import {
  codeBlockAppRoute,
  collectionActionSearchParam,
  collectionAppRoute,
  collectionEditorAppRoute,
  contractAppRoute,
  halEditorAppRoute,
  halExecutorAppRoute,
  halVersionSearchParam,
  transactionAppRoute,
  simulatedTransactionSearchParam,
  tevmForkSearchParam,
  walletAppRoute,
} from "@herd-labs/schemas";
import { linkOptions } from "@tanstack/react-router";

// Typecheck-only: proves shared app route templates still match the registered router.
export const appRouteContract = linkOptions([
  {
    to: contractAppRoute,
    params: { blockchain: "ethereum", contractAddress: "0x1111111111111111111111111111111111111111" },
  },
  {
    to: walletAppRoute,
    params: { blockchain: "base", walletAddress: "0x1111111111111111111111111111111111111111" },
  },
  {
    to: transactionAppRoute,
    params: { blockchain: "base", transactionHash: `0x${"a".repeat(64)}` },
    search: { [simulatedTransactionSearchParam]: true, [tevmForkSearchParam]: "fork-id" },
  },
  {
    to: halEditorAppRoute,
    params: { id: "action-id" },
    search: { [halVersionSearchParam]: "version-id" },
  },
  {
    to: halExecutorAppRoute,
    params: { id: "action-id" },
    search: { [halVersionSearchParam]: "version-id" },
  },
  { to: collectionEditorAppRoute, params: { id: "collection-id" } },
  {
    to: collectionAppRoute,
    params: { id: "collection-id" },
    search: {
      [collectionActionSearchParam]: "action-id",
      [halVersionSearchParam]: "version-id",
    },
  },
  {
    to: codeBlockAppRoute,
    params: { definitionId: "definition-id" },
    search: { [halVersionSearchParam]: "version-id" },
  },
]);
