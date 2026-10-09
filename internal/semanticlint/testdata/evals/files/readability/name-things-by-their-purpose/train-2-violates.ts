import { Effect } from "effect";
import { PatientRepository } from "./patient-repository";
import type { PatientId } from "./ids";

export interface AllergyAlert {
  readonly patientId: PatientId;
  readonly substance: string;
  readonly severity: "mild" | "severe";
}

export const findAllergyAlerts = (
  patientId: PatientId,
  prescribedSubstances: ReadonlyArray<string>,
) =>
  Effect.gen(function* () {
    const repository = yield* PatientRepository;
    const patient = yield* repository.findById(patientId);
    const prescribed = new Set(prescribedSubstances.map((s) => s.toLowerCase()));

    const alerts: Array<AllergyAlert> = [];
    for (const allergy of patient.allergies) {
      if (prescribed.has(allergy.substance.toLowerCase())) {
        alerts.push({ patientId, substance: allergy.substance, severity: allergy.severity });
      }
    }

    const sortedAllergies = alerts.filter((alert) => alert.severity === "severe");
    return { alerts, blocking: sortedAllergies.length > 0 };
  });
