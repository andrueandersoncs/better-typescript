import { Context } from "effect";

import { repositoryLayer, repositoryLayerOverrides } from "../repository.ts";
import type { ProvidedRepository } from "../repository.ts";
import { sessionExecutionCreateRepository } from "./create.ts";
import { sessionExecutionDeleteRepository } from "./delete.ts";
import { sessionExecutionFindRepository } from "./find.ts";
import { sessionExecutionUpdateRepository } from "./update.ts";
import { sessionExecutionUpsertRepository } from "./upsert.ts";

const defaultSessionExecutionRepository = {
  ...sessionExecutionCreateRepository,
  ...sessionExecutionDeleteRepository,
  ...sessionExecutionFindRepository,
  ...sessionExecutionUpdateRepository,
  ...sessionExecutionUpsertRepository,
};

type SessionExecutionRepositoryShape = ProvidedRepository<typeof defaultSessionExecutionRepository>;

export class SessionExecutionRepository extends Context.Service<
  SessionExecutionRepository,
  SessionExecutionRepositoryShape
>()("@herd-labs/dal/sessionExecutions/SessionExecutionRepository") {
  static readonly layer = repositoryLayer(SessionExecutionRepository, defaultSessionExecutionRepository);

  static readonly layerOverrides = (overrides: Partial<SessionExecutionRepositoryShape>) =>
    repositoryLayerOverrides(SessionExecutionRepository, defaultSessionExecutionRepository, overrides);
}
