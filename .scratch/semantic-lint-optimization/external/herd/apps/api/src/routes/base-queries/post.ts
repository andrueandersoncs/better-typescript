import { withClickhouseClient } from "@herd-labs/elysia-plugins/clickhouse";
import { withCoingeckoClient } from "@herd-labs/elysia-plugins/coingecko";
import { withDb } from "@herd-labs/elysia-plugins/db";
import { runElysiaEffect } from "@herd-labs/elysia-plugins/effect";
import { withValTown } from "@herd-labs/elysia-plugins/valtown";
import { withViemClient } from "@herd-labs/elysia-plugins/viem";
import { withZeroexClient } from "@herd-labs/elysia-plugins/zeroex";
import { BaseQuerySchema } from "@herd-labs/schemas";
import {
  ClickhouseClientService,
  CoingeckoClientService,
  ValTownClientService,
  ViemClient,
  ZeroexClientService,
} from "@herd-labs/services/external";
import * as ParamQueries from "@herd-labs/services/paramQueries";
import { Effect, Layer, Schema } from "effect";
import * as FetchHttpClient from "effect/unstable/http/FetchHttpClient";
import { Elysia } from "elysia";

import {
  BaseQueryIdParamsSchema,
  FindOrCreateBaseQueryBodySchema,
  FindOrCreateBaseQueryResponseSchema,
  RetireBaseQueryBodySchema,
} from "../../models/base-queries/index.ts";
import { withUser } from "../../plugins/index.ts";

export const baseQueriesPost = new Elysia()
  .use(withDb())
  .use(withUser)
  .use(withValTown())
  .use(withViemClient())
  .use(withZeroexClient())
  .use(withClickhouseClient())
  .use(withCoingeckoClient())
  .post(
    "/",
    async ({ body, dbLayer, valTownClient, viemClient, zeroexClient, clickhouseClient, coingeckoClient }) =>
      runElysiaEffect(
        Effect.gen(function* () {
          const baseQuery = yield* ParamQueries.findOrCreateBaseQuery(body);
          return { id: baseQuery.id };
        }).pipe(
          Effect.provide(
            Layer.provideMerge(
              ParamQueries.paramQueriesLayer,
              Layer.mergeAll(
                dbLayer,
                Layer.succeed(ValTownClientService, valTownClient),
                Layer.succeed(ViemClient, viemClient),
                Layer.succeed(ZeroexClientService, zeroexClient),
                Layer.succeed(ClickhouseClientService, clickhouseClient),
                Layer.succeed(CoingeckoClientService, coingeckoClient),
                FetchHttpClient.layer
              )
            )
          )
        )
      ),
    {
      body: Schema.toStandardSchemaV1(FindOrCreateBaseQueryBodySchema),
      response: Schema.toStandardSchemaV1(FindOrCreateBaseQueryResponseSchema),
    }
  )
  .post(
    "/:id/retire",
    async ({
      params,
      body,
      user,
      userFlags,
      credential,
      dbLayer,
      valTownClient,
      viemClient,
      zeroexClient,
      clickhouseClient,
      coingeckoClient,
    }) =>
      runElysiaEffect(
        ParamQueries.retireBaseQuery({
          baseQueryId: params.id,
          reason: body.reason,
          reviewer: {
            capabilities: { doubleclickAdminAccess: userFlags.isOn("doubleclickAdminAccess") },
            credential,
            email: user.email,
          },
        }).pipe(
          Effect.provide(
            Layer.provideMerge(
              ParamQueries.paramQueriesLayer,
              Layer.mergeAll(
                dbLayer,
                Layer.succeed(ValTownClientService, valTownClient),
                Layer.succeed(ViemClient, viemClient),
                Layer.succeed(ZeroexClientService, zeroexClient),
                Layer.succeed(ClickhouseClientService, clickhouseClient),
                Layer.succeed(CoingeckoClientService, coingeckoClient),
                FetchHttpClient.layer
              )
            )
          )
        )
      ),
    {
      params: Schema.toStandardSchemaV1(BaseQueryIdParamsSchema),
      body: Schema.toStandardSchemaV1(RetireBaseQueryBodySchema),
      response: Schema.toStandardSchemaV1(BaseQuerySchema),
    }
  )
  .post(
    "/:id/unretire",
    async ({
      params,
      body,
      user,
      userFlags,
      credential,
      dbLayer,
      valTownClient,
      viemClient,
      zeroexClient,
      clickhouseClient,
      coingeckoClient,
    }) =>
      runElysiaEffect(
        ParamQueries.unretireBaseQuery({
          baseQueryId: params.id,
          reason: body.reason,
          reviewer: {
            capabilities: { doubleclickAdminAccess: userFlags.isOn("doubleclickAdminAccess") },
            credential,
            email: user.email,
          },
        }).pipe(
          Effect.provide(
            Layer.provideMerge(
              ParamQueries.paramQueriesLayer,
              Layer.mergeAll(
                dbLayer,
                Layer.succeed(ValTownClientService, valTownClient),
                Layer.succeed(ViemClient, viemClient),
                Layer.succeed(ZeroexClientService, zeroexClient),
                Layer.succeed(ClickhouseClientService, clickhouseClient),
                Layer.succeed(CoingeckoClientService, coingeckoClient),
                FetchHttpClient.layer
              )
            )
          )
        )
      ),
    {
      params: Schema.toStandardSchemaV1(BaseQueryIdParamsSchema),
      body: Schema.toStandardSchemaV1(RetireBaseQueryBodySchema),
      response: Schema.toStandardSchemaV1(BaseQuerySchema),
    }
  );
