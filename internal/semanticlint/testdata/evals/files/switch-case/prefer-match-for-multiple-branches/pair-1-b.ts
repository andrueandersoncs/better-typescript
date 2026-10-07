import * as Match from "effect/Match";

type Shipment = {
  status: "scheduled" | "inTransit" | "delivered";
  trackingNumber: string;
};

export const deliveryMessage = (shipment: Shipment): string =>
  Match.value(shipment.status).pipe(
    Match.when("scheduled", () => "Pickup is scheduled"),
    Match.when("inTransit", () => `Tracking ${shipment.trackingNumber}`),
    Match.when("delivered", () => "Delivered"),
    Match.exhaustive,
  );
