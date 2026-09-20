<div align="center">

# AutoFlow AI

### Hola. Hello. You’re in good hands.

A bilingual front desk for the businesses that keep Miami moving.

**React · TypeScript · Vite · English + Español**

[Live portfolio demo](https://pablomurillolo.github.io/autoflow-ai/) · [Private workspace setup](docs/SERVER.md) · [Explore the code](src) · [Architecture](docs/ARCHITECTURE.md) · [Demo walkthrough](docs/DEMO.md) · [Integration roadmap](docs/INTEGRATIONS.md)

</div>

## New in v0.3

The private workspace now includes an **OpenAI Responses API receptionist**: English/Spanish conversation, strict structured extraction, customer-reviewed draft fields, owner-approved shop facts, and explicit handoff. Owners manage public shop information and AI activation. Persistent daily call caps, input limits, timeouts, and safe provider-failure handling bound usage. **56 automated tests** pass.

**Live AI is not connected or evaluated yet.** No API key is configured. The implementation is tested with mocked provider responses; a separate 16-case bilingual live evaluation requires explicit opt-in. [Connect and evaluate the AI receptionist](docs/AI.md). The static GitHub Pages demo stays key-free and rule-based.

## Included from v0.2

The next roadmap milestone is implemented: an optional **private server workspace** with owner sign-in, SQLite-backed leads, shop-level access controls, server validation, idempotent intake, status updates, export, deletion, and configurable retention. **37 automated tests** cover the demo and server.

The public GitHub Pages demo continues to use browser-local fictional data. The private workspace must run on a Node server with persistent storage; it is not hosted by GitHub Pages. [Run the private workspace](docs/SERVER.md).

## Why AutoFlow?

A busy independent shop cannot answer every question while working on a car. AutoFlow explores a warmer, more organized first contact: understand what a customer needs, collect the right details, and give the owner a clear follow-up queue.

Built by **Pablo Murillo** as a portfolio project and a foundation for a future small-business automation product. The fictional **Miami Auto Care** workspace demonstrates the first step toward a manager, receptionist, marketing, and analytics agent team.

## What works in v0.1

- **Bilingual receptionist:** English and Spanish interface, manual language switching, and lightweight recognition of Spanish and mixed-language requests.
- **Service intake:** brakes, oil changes, tires, A/C, and general inspections. Detects common vehicle makes and asks customers to review the result.
- **Appointment requests:** customer/contact details, vehicle, notes, preferred future date and time window, review, and a saved request reference.
- **Owner dashboard:** lead counts, language counts, searchable/filterable inbox, detail view, status updates, and JSON export.
- **Persistent local demo:** requests survive refresh in the same browser; reset restores four explicitly labeled fictional samples.
- **Agent studio:** shows implemented responsibilities, planned agents, and integration contracts.
- **Responsive layout:** desktop sidebar and a mobile navigation menu, labeled forms, keyboard focus styles, and reduced-motion support.

### Honest demo boundaries

**The public GitHub Pages receptionist is a deterministic, rule-based prototype, not a connected LLM or voice agent.** It runs without API keys, a backend, or paid services. Nothing is sent to a real shop. An appointment request is **not** a confirmed booking. Changing a lead to “Scheduled” changes only the local demo status.

In the **public portfolio demo**, use **fictional contact information only**. Its owner dashboard has no authentication, and browser storage is neither a shared database nor suitable for real customer data. Each browser has its own workspace; clearing browser data deletes its records. The private server has an optional LLM integration; calendar, SMS, CRM, and media generation remain planned.

## Run locally

Requirements: Node.js **24+**, npm, and a modern browser.

```sh
git clone https://github.com/PabloMurillolo/autoflow-ai.git
cd autoflow-ai
npm ci
npm run dev
```

Open the local URL printed by Vite (usually `http://127.0.0.1:5173`). No environment file is required for the static demo. For the authenticated server, follow [private workspace setup](docs/SERVER.md). The interface uses Google Fonts with system font fallbacks.

```sh
npm test          # domain, language, persistence, and failure-path tests
npm run build     # strict TypeScript check + production bundle
npm run preview   # serve the production build locally
npm run check     # tests and production build together
```

## Architecture

```mermaid
flowchart LR
    Customer[Customer: English / Español] --> UI[React receptionist]
    UI --> Receptionist[Receptionist: parse demo request]
    Receptionist --> Review[Customer reviews details]
    Review --> Manager[Manager: validate & capture]
    Manager --> Repo[LeadRepository interface]
    Repo --> Local[Browser storage adapter]
    Local --> Dashboard[Owner dashboard]
    Local --> Analytics[Analytics: derived counts]
    Manager -. future .-> Calendar[Calendar adapter]
    Manager -. future .-> SMS[Consent-based SMS]
    Manager -. future .-> CRM[CRM adapter]
    Manager -. future .-> Marketing[Marketing agent]
    Marketing -. future .-> Higgsfield[Higgsfield media jobs]
```

This diagram shows the browser-local demo. In v0.2 server mode, the customer intake calls a validated API and the authenticated owner dashboard reads shop-scoped SQLite records. See [server architecture](docs/SERVER.md). Solid arrows below are implemented in the demo; dotted arrows are planned. These “agents” are modular responsibilities in a single application, not autonomous deployed services. See [architecture and production migration](docs/ARCHITECTURE.md).

```text
src/
  App.tsx                  Dashboard, receptionist, studio, settings
  domain.ts                Shared lead types, services, validation
  agents/
    receptionist.ts        Deterministic intent/language adapter
    manager.ts             Validates and saves appointment requests
    analytics.ts           Derived dashboard metrics
    marketing.ts           Future campaign brief contract
  integrations/
    contracts.ts           Calendar, SMS, CRM, Higgsfield interfaces
    local-leads.ts         Versioned browser persistence adapter
  domain.test.ts           Behavioral and failure-path tests
```

## Deploy

For the public demo, run `npm run build` and publish **`dist/`** to GitHub Pages, Vercel, Netlify, or any static host. The relative Vite base supports a repository path such as `/autoflow-ai/`. No server runtime or secret configuration is needed.

For GitHub Pages, see [deployment instructions](docs/DEPLOYMENT.md). For Vercel/Netlify, import this repository, choose Vite, use build command `npm run build`, and output directory `dist`. Pages are selected within the application, so no server rewrite is needed.

## Environment and secrets

`.env.example` documents private-server settings and placeholders for future **server-only** integrations. Real `.env` files are ignored. Never put keys into source code, a public repository, local storage, or variables prefixed with `VITE_` (which are exposed in the browser bundle). For AI, both a server key and owner-approved activation are required. Adding keys for other providers does not enable their future integrations.

The v0.2 server implements owner sessions, shop isolation, validation, intake acknowledgment, and basic rate limits. A production deployment still needs durable encrypted storage, HTTPS, monitored backups, appropriate privacy handling, and stronger edge abuse controls. See [operational limits](docs/SERVER.md#operational-limits).

## Roadmap

- [x] v0.1: polished local demo, bilingual intake, appointment requests, lead dashboard, tests, integration contracts.
- [x] v0.2: authenticated owner dashboard, server API, SQLite, tenant isolation, data retention and deletion controls. Server-host deployment is separate from the public demo.
- [x] v0.3 implementation: server-side LLM adapter, structured outputs, bilingual chat, approved shop facts, explicit handoff, and persistent call limits.
- [ ] v0.3 activation gate: configure a private API key, pass live bilingual evaluations, and review real pilot conversations before customer launch.
- [ ] v0.4: calendar availability/confirmation, consent-based SMS, and idempotent CRM synchronization.
- [ ] v0.5: manager orchestration and Higgsfield-powered marketing drafts with human approval.
- [ ] Later: opt-in voice receptionist and campaign attribution analytics.

## Higgsfield marketing agent

The marketing agent will turn an owner-approved service offer into bilingual copy and a creative brief. A **server-side Higgsfield adapter** will submit image/video jobs and track their completion. Owners will review the assets, claims, language, and budget before anything is published. Lead contact details will not be included in generation prompts.

Higgsfield is a proposed external media-generation provider, not a bundled model or an open-source dependency. No API access, price, or generation capability is assumed here. [Integration design and official references](docs/INTEGRATIONS.md) describe the next steps.

## Show it in your portfolio

Follow the [90-second demo script](docs/DEMO.md): open the dashboard, submit a Spanish brake-service request, find it in the inbox, update its status, then show the agent roadmap. Capture the dashboard, Spanish intake, and lead detail view at desktop and mobile sizes. Be explicit about what works today and what is planned.

## License

[MIT](LICENSE). Sample businesses and customer records are fictional.
