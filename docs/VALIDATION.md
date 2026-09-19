# v0.1 validation record

Validated locally September 19, 2026.

- 21 automated tests pass: language/service recognition, invalid contact/date rejection, persistence across repository instances, write failures, corrupt data, and status changes.
- TypeScript and the Vite production build pass.
- Chrome: completed Spanish mixed-language brake-service intake using fictional details; request appeared in owner inbox.
- Chrome: searched the captured lead, opened details, changed status to Contacted, and refreshed; count and saved status persisted.
- Chrome: English oil-change flow rejected an invalid contact, then accepted a corrected fictional email.
- Responsive check: 390×844 mobile confirmation view renders without horizontal page overflow; navigation and desktop overview also inspected.

These checks validate the local demo, not real provider integrations. No external calendar, messaging, CRM, LLM, or media-generation calls were made.
