import type { Lead } from "../domain";
export interface LeadRepository {
  list(): Lead[];
  save(lead: Lead): void;
  replace(leads: Lead[]): void;
}
export interface CalendarAdapter {
  request(
    lead: Lead,
    idempotencyKey: string,
  ): Promise<{ state: "pending" | "confirmed"; externalId: string }>;
}
export interface SmsAdapter {
  send(
    to: string,
    message: string,
    consentId: string,
  ): Promise<{ externalId: string }>;
}
export interface CrmAdapter {
  upsert(lead: Lead): Promise<{ externalId: string }>;
}
export interface HiggsfieldAdapter {
  generate(
    prompt: string,
    approvedAssetUrls: string[],
  ): Promise<{ jobId: string }>;
  status(
    jobId: string,
  ): Promise<{
    state: "queued" | "processing" | "completed" | "failed";
    assetUrl?: string;
  }>;
}
