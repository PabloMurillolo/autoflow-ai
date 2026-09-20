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
