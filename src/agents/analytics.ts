import type { Lead } from "../domain";
export function summarize(leads: Lead[]) {
  return {
    total: leads.length,
    open: leads.filter((l) => l.status === "New").length,
    scheduled: leads.filter((l) => l.status === "Scheduled").length,
    spanish: leads.filter((l) => l.language === "es").length,
  };
}
