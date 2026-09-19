import { seedLeads, validateIntake, type Lead } from "../domain";
import type { LeadRepository } from "./contracts";
export const STORAGE_KEY = "autoflow.leads.v1";
export function isLead(value: unknown): value is Lead {
  if (!value || typeof value !== "object") return false;
  const v = value as Record<string, unknown>;
  if (
    ![
      "id",
      "name",
      "contact",
      "vehicle",
      "service",
      "notes",
      "language",
      "date",
      "time",
      "status",
      "createdAt",
    ].every((k) => typeof v[k] === "string")
  )
    return false;
  return (
    ["New", "Contacted", "Scheduled"].includes(v.status as string) &&
    (v.sample === undefined || typeof v.sample === "boolean") &&
    Number.isFinite(Date.parse(v.createdAt as string)) &&
    validateIntake(v as unknown as Lead, "0000-01-01") === null
  );
}
export function createLocalRepository(
  storage: Pick<Storage, "getItem" | "setItem">,
): LeadRepository {
  return {
    list() {
      const raw = storage.getItem(STORAGE_KEY);
      if (raw === null) {
        const initial = seedLeads();
        storage.setItem(STORAGE_KEY, JSON.stringify(initial));
        return initial;
      }
      const parsed: unknown = JSON.parse(raw);
      if (!Array.isArray(parsed) || !parsed.every(isLead))
        throw new Error("Invalid saved data");
      return parsed;
    },
    save(lead) {
      this.replace([lead, ...this.list()]);
    },
    replace(leads) {
      storage.setItem(STORAGE_KEY, JSON.stringify(leads));
    },
  };
}
