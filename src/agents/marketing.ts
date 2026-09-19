import type { Language, Service } from "../domain";
export interface CampaignBrief {
  service: Service;
  language: Language;
  audience: string;
  offer: string;
  brandAssetUrls: string[];
}
export interface MarketingAgent {
  draft(
    brief: CampaignBrief,
  ): Promise<{ copy: string; mediaJobId?: string; requiresApproval: true }>;
}
// Contract only: no provider or publishing is connected in v0.1.
