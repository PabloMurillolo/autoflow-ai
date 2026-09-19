# Architecture and tradeoffs

## Scope

React + TypeScript and Vite produce a small static app that is easy to inspect, run, and host. No paid account is needed. The v0.1 priority is a reliable, explainable demo of the customer-to-owner workflow; natural-language sophistication and shared production storage come later.

The receptionist uses keyword recognition to suggest a service and language. It recognizes a bounded list of makes; extraction is deliberately approximate. It never diagnoses a vehicle, quotes a price, or claims availability. The customer reviews all detected fields. Unsupported requests default to general inspection.

The manager validates the complete intake before assigning a UUID, creation timestamp, and `New` status. The lead repository contract isolates persistence. Browser storage failures propagate to the UI: the app never claims a request is saved when a write fails. Malformed saved data is not silently overwritten; Settings offers an explicit reset. The dashboard derives its counts from the records, including clearly labeled samples.

## Data contract

A lead contains `id`, `name`, `contact`, `vehicle`, `service`, `notes`, `language`, `date`, `time`, `status`, and `createdAt`. Seed records additionally have `sample: true`. `date` is a date-only preference in the shop’s America/New_York timezone. `time` is Morning or Afternoon, not an available slot. Same-day requests are excluded; future dates require shop confirmation. No scheduling availability is inferred.

Status lifecycle: New → Contacted → Scheduled. The demo permits changing status in either direction so a reviewer can explore it. These are owner-maintained labels with no external side effects. JSON export keeps the complete schema and avoids CSV formula-injection issues.

Storage key: `autoflow.leads.v1`. Browser storage is synchronous and local to an origin. Changes in another tab refresh this tab via the storage event. Concurrent edits are last-writer-wins, and the demo makes no transactional guarantees. No messages, credentials, or real customer information should be stored here.

## Moving to production

1. Add a server API and database with owner authentication, per-shop authorization, migrations, backups, and data lifecycle controls. Replace the local adapter with an asynchronous API repository and update manager/UI loading states.
2. Move validation to the server as the authority. Add request size limits, abuse controls, logging without contact details, and idempotency tokens for retries. Define clear consent and privacy handling before collecting real details.
3. Implement a structured-output LLM adapter behind the receptionist. Treat customer text as untrusted; allow only typed service-intake actions. Keep irreversible side effects outside the model. Evaluate Spanish, English, mixed-language, unsupported requests, and prompt injection.
4. Add calendar availability in shop time, explicit owner confirmation, atomic slot reservation, and reconciliation. An intake request must never imply a reserved slot.
5. Add an outbox/queue for SMS and CRM jobs with retries and deduplication. SMS requires recorded consent and opt-out handling.
6. Add marketing draft generation with approval gates, provider budget caps, and audit trails. No automatic publishing.

## Accessibility and testing

Semantic buttons, labels, native form controls, visible focus, language metadata on the receptionist, status announcements, and responsive layouts are included. The demo should be reviewed with a screen reader and real devices before production. The test suite covers parser behavior, invalid dates/contact details, persistence, corrupt data, failed writes, and status updates. Manual browser checks cover the complete English and Spanish journeys, search, filters, reload, and narrow viewports.
