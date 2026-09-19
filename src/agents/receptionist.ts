import type { Language, Service } from "../domain";
/** Deterministic demo adapter. No LLM, network calls, diagnosis, or booking promises. */
export function understandRequest(message: string): {
  language: Language;
  service: Service;
  vehicle: string;
  notes: string;
} {
  const text = message.toLowerCase();
  const language: Language =
    /\b(hola|necesito|quiero|frenos|aceite|llantas|carro|coche|gracias|mi|aire)\b|[¿¡ñáéíóú]/i.test(
      text,
    )
      ? "es"
      : "en";
  const service: Service = /brak|freno/.test(text)
    ? "brakes"
    : /oil|aceite/.test(text)
      ? "oil"
      : /tire|llanta|alignment|alineaci/.test(text)
        ? "tires"
        : /a\/c|air condition|aire|cooling/.test(text)
          ? "ac"
          : "diagnostic";
  const vehicle =
    message.match(
      /(?:\b(?:19|20)\d{2}\s+)?\b(?:Honda|Toyota|Ford|Hyundai|Kia|Nissan|Chevrolet|BMW|Mercedes|Tesla|Mazda|Volkswagen)\b(?:\s+[A-Za-z0-9-]+){0,2}/i,
    )?.[0] ?? "";
  return { language, service, vehicle, notes: message.slice(0, 1000) };
}
