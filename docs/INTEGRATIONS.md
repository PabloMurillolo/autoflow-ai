# Future integrations

All interfaces live in `src/integrations/contracts.ts`. They are extension points, not enabled integrations. `.env.example` contains empty server-only placeholders. Never read these from client code.

## Higgsfield and the marketing agent

Workflow: owner defines an offer → marketing agent drafts bilingual copy and a visual brief → owner approves a generation budget → server calls Higgsfield → job runs asynchronously → server reconciles completion → owner reviews assets → approved assets can later be published through a separate channel integration.

The brief contains a service, audience, approved offer, language, and owner-authorized brand images. Customer names, contact information, and intake notes do not belong in prompts. Treat provider URLs as untrusted until validated. Store generated assets in controlled storage under a retention policy, and check rights to all supplied logos, music, and footage.

The proposed `HiggsfieldAdapter` exposes `generate` and `status`; these are application abstractions, **not literal provider endpoints**. Before implementation, check current provider endpoints, supported models, job lifecycle, credentials, pricing, and usage rights. Keep credential pairs on the server. Authenticate webhook callbacks using the provider's documented mechanism if available, deduplicate events, and fall back to bounded polling with timeouts. Support failed and canceled jobs without charging or publishing again on retries.

Do not promise results, guaranteed bookings, fabricated reviews, or unapproved discounts in generated campaigns. English and Spanish drafts both need owner review. Generation approval is separate from publication approval.

Official references checked September 19, 2026:

- [Official Higgsfield platforms](https://higgsfield.ai/creator-hub/help-center/getting-started/official-higgsfield-platforms)
- [Higgsfield API documentation](https://docs.higgsfield.ai/)
- [Developer quick start](https://open.higgsfield.ai/quick-start)

This repository does not claim Higgsfield itself is open source. The MIT license applies to this project’s code.

## Calendar

Represent the appointment request separately from a booking. Query real availability in America/New_York, confirm with the owner/customer, reserve atomically, and reconcile reschedules/cancellations. Use idempotency keys to prevent duplicate bookings. Calendar OAuth credentials and tokens belong on the server, never in browser storage.

## SMS

Require explicit message consent, store its provenance, support opt-out and quiet hours, and localize the text. Phone capture alone is not SMS consent. No messages are sent in this release. Add provider delivery handling and a queue before activating follow-ups.

## CRM

Map the typed lead contract to provider fields. Use AutoFlow's lead ID as an idempotency reference. Limit fields to business need, isolate tenants, avoid duplicate contact creation, and reconcile deletion and retention rules.

## Manager and analytics

Keep orchestration explicit: permitted events, durable job states, retry limits, and human escalation. Add campaign attribution only with a defined event model and appropriate consent. Current analytics are simple derived counts, not revenue, conversion, or performance claims.
