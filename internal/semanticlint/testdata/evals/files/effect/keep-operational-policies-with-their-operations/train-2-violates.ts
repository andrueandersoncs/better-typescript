import { Effect } from "effect";
import { ThumbnailStore } from "./thumbnail-store";
import { resizeImage } from "./resize";

export interface ThumbnailRequest {
  readonly assetId: string;
  readonly widths: ReadonlyArray<number>;
}

export const generateThumbnails = (request: ThumbnailRequest, concurrency: number) =>
  Effect.gen(function* () {
    const store = yield* ThumbnailStore;
    const original = yield* store.loadOriginal(request.assetId);
    return yield* Effect.forEach(
      request.widths,
      (width) =>
        resizeImage(original, width).pipe(
          Effect.flatMap((bytes) => store.saveThumbnail(request.assetId, width, bytes)),
        ),
      { concurrency },
    );
  }).pipe(Effect.withSpan("thumbnails.generate"));

export const handleUpload = (assetId: string) =>
  Effect.gen(function* () {
    yield* Effect.logInfo("asset uploaded", { assetId });
    return yield* generateThumbnails({ assetId, widths: [64, 256, 1024] }, 2);
  });
