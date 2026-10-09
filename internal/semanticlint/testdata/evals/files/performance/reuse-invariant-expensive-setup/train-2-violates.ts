import { Effect, Schema } from "effect";
import { EventQueue } from "./event-queue";

const DeviceReading = Schema.Struct({
  deviceId: Schema.String,
  temperatureC: Schema.Number,
  recordedAt: Schema.DateFromString,
});

export type DeviceReading = typeof DeviceReading.Type;

const isSensorTopic = (topic: string): boolean => topic.startsWith("sensors/");

export const ingestReadings = (rawMessages: ReadonlyArray<{ topic: string; payload: unknown }>) =>
  Effect.gen(function* () {
    const queue = yield* EventQueue;
    const accepted: Array<DeviceReading> = [];

    for (const message of rawMessages) {
      if (!isSensorTopic(message.topic)) {
        continue;
      }
      const decode = Schema.decodeUnknownOption(DeviceReading);
      const reading = decode(message.payload);
      if (reading._tag === "Some") {
        accepted.push(reading.value);
      }
    }

    yield* queue.publishAll("readings.accepted", accepted);
    return accepted.length;
  });
