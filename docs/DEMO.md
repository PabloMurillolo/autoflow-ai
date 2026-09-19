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
