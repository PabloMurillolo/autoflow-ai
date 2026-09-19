import { validateIntake, type Intake, type Lead } from "../domain";
import type { LeadRepository } from "../integrations/contracts";
/** The manager owns validation and persistence. Calendar/SMS are deliberately not invoked. */
export function captureRequest(
  input: Intake,
  repository: LeadRepository,
): Lead {
  const error = validateIntake(input);
  if (error) throw new Error(error);
  const lead: Lead = {
    ...input,
    name: input.name.trim(),
    contact: input.contact.trim(),
    vehicle: input.vehicle.trim(),
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
    status: "New",
  };
  repository.save(lead);
  return lead;
}
