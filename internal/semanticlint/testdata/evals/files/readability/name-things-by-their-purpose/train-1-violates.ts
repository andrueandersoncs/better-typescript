import type { Shipment, Warehouse } from "./types";
import { distanceKm } from "./geo";

export interface DispatchPlan {
  readonly warehouseId: string;
  readonly shipmentIds: ReadonlyArray<string>;
  readonly totalWeightKg: number;
}

const MAX_TRUCK_WEIGHT_KG = 12_000;

export function planDispatch(
  warehouse: Warehouse,
  shipments: ReadonlyArray<Shipment>,
): DispatchPlan {
  const list = shipments
    .filter((shipment) => shipment.status === "ready")
    .sort((a, b) => distanceKm(warehouse.location, a.destination) - distanceKm(warehouse.location, b.destination));

  const shipmentIds: Array<string> = [];
  let totalWeightKg = 0;
  for (const shipment of list) {
    if (totalWeightKg + shipment.weightKg > MAX_TRUCK_WEIGHT_KG) {
      break;
    }
    shipmentIds.push(shipment.id);
    totalWeightKg += shipment.weightKg;
  }

  return { warehouseId: warehouse.id, shipmentIds, totalWeightKg };
}
