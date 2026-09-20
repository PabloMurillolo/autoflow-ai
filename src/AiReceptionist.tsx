import { useEffect, useRef, useState } from "react";
import { MessageSquare, Send, ArrowRight, ShieldCheck } from "lucide-react";
import { api, ApiError, type OwnerSession } from "./integrations/api";
import { services, type Intake, type Language } from "./domain";

type Knowledge = {
  enabled: boolean;
  hours: string;
  address: string;
  contact: string;
  services: string[];
};
type Answer = {
  reply: string;
  handoff: boolean;
  reason: string | null;
  contact: string;
  draft: {
    service: Intake["service"] | null;
    vehicle: string | null;
    date: string | null;
    time: string | null;
    language: Language;
  } | null;
};
export function AiReceptionist({
  shop,
  onForm,
}: {
  shop: string;
  onForm: (draft?: Partial<Intake>) => void;
}) {
  const [language, setLanguage] = useState<Language>("en"),
    [text, setText] = useState(""),
    [consent, setConsent] = useState(false),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const [availability, setAvailability] = useState<{
    available: boolean;
    contact: string;
  } | null>(null);
  const [turns, setTurns] = useState<{ user: string; answer: Answer }[]>([]);
  const sending = useRef(false),
    bottom = useRef<HTMLDivElement>(null);
  const es = language === "es";
  useEffect(() => {
    let active = true;
    api<{ available: boolean; contact: string }>(`/shops/${shop}/receptionist`)
      .then((v) => {
        if (active) setAvailability(v);
      })
      .catch(() => {
        if (active) setAvailability({ available: false, contact: "" });
      });
    return () => {
      active = false;
    };
  }, [shop]);
  useEffect(() => {
    bottom.current?.scrollIntoView({ block: "nearest" });
  }, [turns, busy]);
  const latest = turns.at(-1)?.answer;
  function useDraft() {
    const draft: Partial<Intake> = {
      language,
      notes: turns
        .map((t) => t.user)
        .join("\n")
        .slice(0, 1000),
    };
    if (latest?.draft)
      for (const [key, value] of Object.entries(latest.draft))
        if (value !== null) Object.assign(draft, { [key]: value });
    draft.language = language;
    onForm(draft);
  }
  async function send(e: React.FormEvent) {
    e.preventDefault();
    if (sending.current || !text.trim() || !consent || turns.length >= 8)
      return;
    sending.current = true;
    setBusy(true);
    setError("");
    const user = text.trim();
    try {
      const answer = await api<Answer>(`/shops/${shop}/receptionist`, {
        method: "POST",
        body: JSON.stringify({
          language,
          consent,
          messages: [...turns.map((t) => t.user), user],
        }),
      });
      setTurns((v) => [...v, { user, answer }]);
      setText("");
    } catch (e) {
      setError(
        e instanceof ApiError && e.status === 429
          ? es
            ? "Se alcanzó el límite del asistente. Usa el formulario o contacta al taller."
            : "The assistant limit was reached. Use the form or contact the shop."
          : es
            ? "El asistente no está disponible. Tus datos siguen aquí; usa el formulario o inténtalo de nuevo."
            : "The assistant is unavailable. Your message is still here; use the form or try again.",
      );
    } finally {
      sending.current = false;
      setBusy(false);
    }
  }
  return (
    <section className="ai-layout" lang={language}>
      <div className="ai-intro">
        <span className="eyebrow">AUTOFLOW RECEPTIONIST · EN / ES</span>
        <h1>
          {es
            ? "Cuéntanos qué necesita tu auto."
            : "Tell us what your car needs."}
        </h1>
        <p>
          {es
            ? "Pregunta por los servicios del taller o prepara una solicitud para revisar."
            : "Ask about shop services or prepare a request to review."}
        </p>
        <div className="ai-language" aria-label="Conversation language">
          <button
            className={!es ? "primary" : "secondary"}
            disabled={busy}
            onClick={() => setLanguage("en")}
          >
            English
          </button>
          <button
            className={es ? "primary" : "secondary"}
            disabled={busy}
            onClick={() => setLanguage("es")}
          >
            Español
          </button>
        </div>
        <div className="panel ai-boundary">
          <ShieldCheck size={24} />
          <h2>
            {es
              ? "Información del taller. Tú tienes el control."
              : "Shop information. You stay in control."}
          </h2>
          <p>
            {es
              ? "La IA interpreta tus mensajes. Las respuestas usan información aprobada por el taller. Revisa todos los datos antes de enviarlos."
              : "AI interprets your messages. Answers use shop-approved information. Review all details before submitting."}
          </p>
          <p>
            {es
              ? "No diagnostica, no da precios ni confirma citas. No se envían mensajes al taller desde este chat."
              : "No diagnoses, price quotes, or confirmed bookings. This chat does not notify the shop."}
          </p>
          {availability?.contact && (
            <p>
              <strong>{es ? "Contacto del taller" : "Shop contact"}:</strong>{" "}
              {availability.contact}
            </p>
          )}
          <button
            className="secondary full"
            disabled={busy}
            onClick={() => onForm()}
          >
            {es ? "Usar formulario sin IA" : "Use form without AI"}
            <ArrowRight size={15} />
          </button>
        </div>
      </div>
      <div className="panel ai-chat">
        <div className="panel-heading">
          <h2>
            <MessageSquare size={18} />{" "}
            {es ? "Tu conversación" : "Your conversation"}
          </h2>
          <span className="demo-pill">
            {availability === null
              ? es
                ? "Conectando"
                : "Connecting"
              : availability.available
                ? "AI"
                : es
                  ? "Sin conexión IA"
                  : "AI not connected"}
          </span>
        </div>
        <div
          className="ai-transcript"
          role="log"
          aria-label={es ? "Conversación" : "Conversation"}
          aria-live="polite"
        >
          <p className="ai-welcome">
            {es
              ? "Hola. Puedo ayudarte con servicios, horarios y solicitudes. Comparte el servicio y el vehículo; añade tus datos de contacto solo en el formulario."
              : "Hi. I can help with services, hours, and requests. Share the service and vehicle; add your contact details only in the form."}
          </p>
          {turns.map((t, i) => (
            <div key={i}>
              <div className="ai-customer">
                <span>{es ? "Tú" : "You"}</span>
                <p>{t.user}</p>
              </div>
              <div className="ai-answer">
                <span>AutoFlow</span>
                <p>{t.answer.reply}</p>
                {t.answer.handoff && (
                  <p className="server-notice">
                    {es
                      ? "Contacta al taller directamente"
                      : "Contact the shop directly"}
                    :{" "}
                    {t.answer.contact ||
                      (es ? "Consulta al propietario" : "Ask the owner")}
                  </p>
                )}
              </div>
            </div>
          ))}
          {busy && (
            <p role="status">
              {es
                ? "Interpretando tu solicitud…"
                : "Understanding your request…"}
            </p>
          )}
          <div ref={bottom} />
        </div>
        {availability && !availability.available && (
          <p className="server-notice">
            {es
              ? "La IA aún no está activada para este taller. Puedes enviar una solicitud con el formulario."
              : "AI is not activated for this shop yet. You can still submit a request using the form."}
          </p>
        )}
        {error && (
          <p role="alert" className="error-banner">
            {error}
          </p>
        )}
        <form onSubmit={send} className="ai-composer">
          <label className="ai-consent">
            <input
              type="checkbox"
              checked={consent}
              disabled={busy}
              onChange={(e) => setConsent(e.target.checked)}
            />
            <span>
              {es
                ? "Acepto enviar los mensajes de esta conversación a OpenAI para interpretarlos. AutoFlow no guarda el chat. No incluyas nombres, teléfonos, correos, VIN ni información sensible."
                : "I agree to send this conversation’s messages to OpenAI for interpretation. AutoFlow does not save the chat. Do not include names, phone numbers, emails, VINs, or sensitive information."}{" "}
              <a
                href="https://platform.openai.com/docs/guides/your-data"
                target="_blank"
                rel="noreferrer"
              >
                {es ? "Datos del proveedor" : "Provider data policy"}
              </a>
            </span>
          </label>
          <label className="field">
            {es ? "Tu mensaje" : "Your message"}
            <textarea
              rows={3}
              maxLength={600}
              value={text}
              disabled={busy || !availability?.available}
              onChange={(e) => setText(e.target.value)}
              placeholder={
                es
                  ? "Necesito cambiar los frenos de mi Honda Accord."
                  : "I need brake service for my Honda Accord."
              }
            />
          </label>
          <div className="ai-actions">
            <span>
              {turns.length}/8 {es ? "mensajes" : "messages"}
            </span>
            <button
              className="primary"
              disabled={
                busy ||
                !availability?.available ||
                !consent ||
                !text.trim() ||
                turns.length >= 8
              }
            >
              <Send size={16} />
              {es ? "Enviar" : "Send"}
            </button>
          </div>
        </form>
        {(latest || turns.length === 8) && (
          <div className="ai-actions">
            <button
              className="secondary"
              disabled={busy}
              onClick={() => {
                setTurns([]);
                setError("");
                setText("");
              }}
            >
              {es ? "Nueva conversación" : "New conversation"}
            </button>
            <button className="primary" disabled={busy} onClick={useDraft}>
              {es ? "Revisar solicitud" : "Review request"}
              <ArrowRight size={16} />
            </button>
          </div>
        )}
      </div>
    </section>
  );
}

export function KnowledgeSettings({
  session,
  expired,
}: {
  session: OwnerSession;
  expired: () => void;
}) {
  const [value, setValue] = useState<Knowledge | null>(null),
    [info, setInfo] = useState(""),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [notice, setNotice] = useState("");
  useEffect(() => {
    api<{
      knowledge: Knowledge;
      providerConfigured: boolean;
      dailyLimit: number;
      usedToday: number;
    }>("/knowledge")
      .then((r) => {
        setValue(r.knowledge);
        setInfo(
          `${r.providerConfigured ? "API key configured (connection not verified)" : "API key not configured"} · ${r.usedToday}/${r.dailyLimit} daily calls used (UTC).`,
        );
      })
      .catch((e) => {
        if (e instanceof ApiError && e.status === 401) expired();
        else setError("Could not load shop information.");
      });
  }, [session.shopSlug]);
  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setError("");
    setNotice("");
    try {
      setValue(
        await api<Knowledge>("/knowledge", {
          method: "PATCH",
          headers: { "x-csrf-token": session.csrf },
          body: JSON.stringify(value),
        }),
      );
      setNotice(
        "Shop information saved. Customers must reload to see activation changes.",
      );
    } catch (e) {
      if (e instanceof ApiError && e.status === 401) expired();
      else
        setError(
          "Could not save. Add a shop contact and at least one service before enabling AI.",
        );
    } finally {
      setBusy(false);
    }
  }
  return (
    <details className="panel knowledge-panel">
      <summary>Receptionist settings · approved shop information</summary>
      <p>{info}</p>
      <p>
        Only enter public business information. These exact hours and address
        are shown to customers; add both languages if needed. AI never provides
        prices, diagnoses, or booking confirmations.
      </p>
      {error && (
        <p role="alert" className="error-banner">
          {error}
        </p>
      )}
      {notice && (
        <p role="status" className="server-notice">
          {notice}
        </p>
      )}
      {value && (
        <form onSubmit={save}>
          <div className="form-grid">
            {(["hours", "address", "contact"] as const).map((k) => (
              <label className="field" key={k}>
                {k === "hours"
                  ? "Hours · horario"
                  : k === "address"
                    ? "Address · dirección"
                    : "Shop contact · contacto"}
                <input
                  maxLength={300}
                  value={value[k]}
                  onChange={(e) => setValue({ ...value, [k]: e.target.value })}
                />
              </label>
            ))}
          </div>
          <fieldset>
            <legend>Services offered</legend>
            {Object.entries(services).map(([key, s]) => (
              <label className="ai-consent" key={key}>
                <input
                  type="checkbox"
                  checked={value.services.includes(key)}
                  onChange={(e) =>
                    setValue({
                      ...value,
                      services: e.target.checked
                        ? [...value.services, key]
                        : value.services.filter((x) => x !== key),
                    })
                  }
                />
                {s.en} / {s.es}
              </label>
            ))}
          </fieldset>
          <label className="ai-consent">
            <input
              type="checkbox"
              checked={value.enabled}
              onChange={(e) =>
                setValue({ ...value, enabled: e.target.checked })
              }
            />
            I approve this information and enable AI for this shop. Provider
            charges may apply when a server API key is configured.
          </label>
          <button className="primary" disabled={busy}>
            {busy ? "Saving…" : "Save shop information"}
          </button>
        </form>
      )}
    </details>
  );
}
