# Portfolio demo guide

## 90-second walkthrough

1. Open the overview. Explain the fictional Miami shop, local-only data, and four labeled sample customers.
2. Choose **Try the receptionist**. Enter: “Hola, necesito cambiar los brakes de mi Honda Accord.” The demo detects Spanish and brake service. Review the suggested vehicle.
3. Use **Alex Demo**, **alex@example.com**, and **2020 Honda Accord**. Choose a future date and morning. Check the fictional-data acknowledgment.
4. Review and submit. Point out **Pendiente de confirmación del taller**: this is a request, not a booking.
5. Open the owner dashboard. Search **Alex Demo**, inspect details, and change status to Contacted. Refresh to demonstrate browser persistence.
6. Show Agent studio. Explain the manager/receptionist separation, analytics counts, and future Higgsfield marketing workflow.

For an English run, choose English explicitly and try “I need an oil change for my 2021 Toyota Camry.” Use another fictional email. Show that manual language choice overrides detection.

## Screenshots and recording

Recommended frames: dashboard at 1440×1000, Spanish intake at desktop width, a newly captured lead's detail dialog, and the mobile dashboard at 390×844. Reset the demo before screenshots and use only fictional contact information. Keep screenshots in `docs/screenshots/` if adding them to the README. Record at 1080p with the pointer visible; avoid showing other browser tabs or accounts.

Suggested narration: “I built AutoFlow AI to explore how bilingual service intake can help Miami small businesses. This first release demonstrates the complete local workflow. The next release replaces local storage with an authenticated server and connects the receptionist to a real language model.”

## What to explain in an interview

- Why a deterministic demo offers reproducible behavior while the architecture prepares for a live LLM.
- How validation and explicit appointment-request language prevent misleading confirmations.
- Why browser persistence is convenient for a portfolio but unsuitable for customer operations.
- How provider contracts let calendar, SMS, CRM, and Higgsfield evolve independently.
- How failed writes and corrupt saved data are handled without false success.

## v0.2 private-workspace walkthrough

Follow SERVER.md to provision your own local owner account. Start the Node server, submit a fictional Spanish request, then use Owner sign-in to open the private dashboard. Inspect the request, change its status, reload, and sign out. Explain that the database belongs to the server and survives browser clearing; only authenticated owners can list it. Provision a second shop to demonstrate isolation. The public GitHub Pages link intentionally continues to show the safe local demo.

## v0.3 private AI walkthrough

Configure the private server and owner-approved facts using [AI setup](AI.md). Demonstrate the explicit AI data acknowledgment, then ask in English about hours and in Spanish about brake service for a Honda Accord. Use Review request to inspect/edit the suggested fields, add fictional contact details in the form, and submit a pending request. Ask for an exact price to show the direct-contact handoff. Do not imply that the handoff notifies staff or that a request books a slot. Without an API key, show the honest “AI not connected” state and the guided form. Complete the live evaluation gate before presenting the connection as verified.
