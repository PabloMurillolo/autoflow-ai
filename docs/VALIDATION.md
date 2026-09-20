# v0.1 validation record

Validated locally September 19, 2026.

- 21 automated tests pass: language/service recognition, invalid contact/date rejection, persistence across repository instances, write failures, corrupt data, and status changes.
- TypeScript and the Vite production build pass.
- Chrome: completed Spanish mixed-language brake-service intake using fictional details; request appeared in owner inbox.
- Chrome: searched the captured lead, opened details, changed status to Contacted, and refreshed; count and saved status persisted.
- Chrome: English oil-change flow rejected an invalid contact, then accepted a corrected fictional email.
- Responsive check: 390×844 mobile confirmation view renders without horizontal page overflow; navigation and desktop overview also inspected.

These checks validate the local demo, not real provider integrations. No external calendar, messaging, CRM, LLM, or media-generation calls were made.

## v0.2 validation

- All 21 original demo tests plus 16 server tests pass (37 total).
- Both static-demo and server-workspace TypeScript/Vite builds pass.
- Server tests cover unauthenticated access denial, two-shop isolation, cross-shop mutation/deletion denial, CSRF and origin checks, secure cookie attributes, failed sign-in, idempotent submissions, validation, rate limiting, session expiry/logout, persistent database reopen, and retention.
- Chrome: submitted a fictional Spanish request to the Node API, signed in as the local test owner, and saw the persisted request in the private dashboard. Updated its status and confirmed the session survives a page reload.
- The server uses an isolated test database outside the project. No default owner credentials or customer records are committed.
- The public GitHub Pages deployment remains the static demo. The private server has been validated locally; deployment to a persistent server host is still required. The Docker template has not been runtime-tested.

## v0.3 validation — September 20, 2026

- 56 automated tests pass: 21 domain, 16 existing server, and 19 AI adapter/API tests. Both static and private-server production builds pass.
- Tests use injected responses: strict schema/request configuration, invalid JSON/fields/dates, refusal, incomplete outputs, provider error/timeout, English/Spanish rendering, missing facts, price/safety/uncertainty handoff, owner-only knowledge with CSRF, cross-shop isolation, consent and input limits, persistent per-shop/global budgets, concurrent-call limits, and disabling AI during an in-flight response.
- Chrome verified the real missing-key state and authenticated saving of fictional shop facts in a local test database. Enabling shop approval alone did not connect a provider.
- A separate local test harness injected fake responses (no external calls). Spanish chat suggestions populated the editable service/vehicle/date form; explicit review/submission saved a pending request. An English quote request displayed shop contact rather than a price. This is UI flow validation, not a live model evaluation.
- Desktop screenshot inspected; 390×844 mobile layout had matching viewport/document widths (no horizontal overflow).
- No API key or `.env` is configured. The 16-case live model evaluation has **not run**. API activation, live bilingual quality review, and private hosting remain prerequisites for a customer pilot. No prospect outreach occurred.
