// Explicit opt-in only: never executed by npm test or CI. Uses fictional data.
import { readFile } from "node:fs/promises";
import { createReceptionist } from "./receptionist.mjs";
if (process.env.RUN_LIVE_AI_EVAL !== "yes" || !process.env.OPENAI_API_KEY) {
  console.error(
    "Not run. Set a private OPENAI_API_KEY and RUN_LIVE_AI_EVAL=yes to authorize 16 paid API calls with fictional evaluation data.",
  );
  process.exit(2);
}
const cases = JSON.parse(
  await readFile(
    new URL("../evals/receptionist.json", import.meta.url),
    "utf8",
  ),
);
const assistant = createReceptionist({
  apiKey: process.env.OPENAI_API_KEY,
  model: process.env.OPENAI_MODEL || "gpt-4o-mini",
});
let passed = 0;
for (const c of cases) {
  try {
    const r = await assistant({
      messages: c.messages,
      language: c.language,
      today: "2026-09-20",
    });
    const ok =
      (!c.intent || c.intent.includes(r.intent)) &&
      ["service", "vehicle", "date", "time", "uncertain"].every(
        (k) => !Object.hasOwn(c, k) || r[k] === c[k],
      );
    console.log(`${ok ? "PASS" : "FAIL"} ${c.id}`);
    if (ok) passed++;
  } catch {
    console.log(`FAIL ${c.id}: provider error or invalid output`);
  }
}
console.log(
  `${passed}/${cases.length} live cases passed. Review every failure before a pilot; these cases are not a complete safety or quality evaluation.`,
);
process.exitCode = passed === cases.length ? 0 : 1;
