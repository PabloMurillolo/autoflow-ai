import { useState, useEffect, useRef } from "react";
import {
  ArrowUpRight,
  ArrowRight,
  LayoutDashboard,
  MessageSquare,
  Users,
  Workflow,
  Settings2,
  Plus,
  Search,
  ChevronRight,
  Globe2,
  Clock3,
  Check,
  Send,
  CarFront,
  Wrench,
  CalendarDays,
  X,
  Download,
  RotateCcw,
  Sparkles,
  CircleHelp,
  CheckCircle2,
  Menu,
} from "lucide-react";
import {
  services,
  nextDay,
  seedLeads,
  type Lead,
  type Intake,
  type Language,
  type Service,
  type Status,
} from "./domain";
import { understandRequest } from "./agents/receptionist";
import { captureRequest } from "./agents/manager";
import { summarize } from "./agents/analytics";
import { createLocalRepository } from "./integrations/local-leads";
const repository = {
  list: () => createLocalRepository(window.localStorage).list(),
  save: (lead: Lead) => createLocalRepository(window.localStorage).save(lead),
  replace: (leads: Lead[]) =>
    createLocalRepository(window.localStorage).replace(leads),
};
const copy = {
  en: {
    title: "Good service starts with a conversation.",
    intro:
      "Tell us what your car needs. We’ll help you request a visit with Miami Auto Care.",
    greet:
      "Hi! I’m the AutoFlow demo assistant. What can we help you with today?",
    placeholder: "e.g. I need brakes for my Honda Accord",
    send: "Let’s get started",
    details: "A few details, and you’re on your way.",
    desc: "Check the service and vehicle I picked up, then tell us how to reach you.",
    name: "Your name",
    contact: "Email or phone",
    vehicle: "Year, make & model",
    service: "Service",
    notes: "Anything else we should know?",
    date: "Preferred date",
    time: "Preferred time",
    morning: "Morning · 8 am–12 pm",
    afternoon: "Afternoon · 12–5 pm",
    consent:
      "I understand this is a local demo and will use fictional details.",
    review: "Review request",
    reviewTitle: "Looking good. Let’s review.",
    reviewDesc:
      "This is a request, not a confirmed appointment. The shop would contact you to confirm availability.",
    submit: "Send appointment request",
    back: "Back",
    success: "You’re on the list!",
    successDesc:
      "Your demo request is saved in this browser. No message was sent and no appointment was booked.",
    again: "Start another conversation",
    view: "View in owner dashboard",
    error: "Please check the highlighted field.",
    saveError:
      "We couldn’t save your request. Browser storage may be full or disabled. Your details are still here.",
    demo: "Guided demo · No live AI or phone calls",
    pending: "Pending shop confirmation",
    preferred: "Preferred visit",
    newChat: "New conversation",
  },
  es: {
    title: "Un buen servicio empieza con una conversación.",
    intro:
      "Cuéntanos qué necesita tu carro. Te ayudamos a solicitar una visita con Miami Auto Care.",
    greet:
      "¡Hola! Soy el asistente de demostración de AutoFlow. ¿En qué podemos ayudarte?",
    placeholder: "Ej. Necesito frenos para mi Honda Accord",
    send: "Empecemos",
    details: "Unos detalles y estamos listos.",
    desc: "Revisa el servicio y el vehículo que detecté y dinos cómo contactarte.",
    name: "Tu nombre",
    contact: "Correo o teléfono",
    vehicle: "Año, marca y modelo",
    service: "Servicio",
    notes: "¿Algo más que debamos saber?",
    date: "Fecha preferida",
    time: "Horario preferido",
    morning: "Mañana · 8 am–12 pm",
    afternoon: "Tarde · 12–5 pm",
    consent: "Entiendo que es una demo local y usaré datos ficticios.",
    review: "Revisar solicitud",
    reviewTitle: "Todo listo. Revisemos.",
    reviewDesc:
      "Es una solicitud, no una cita confirmada. El taller te contactaría para confirmar disponibilidad.",
    submit: "Enviar solicitud de cita",
    back: "Atrás",
    success: "¡Ya estás en la lista!",
    successDesc:
      "Tu solicitud de prueba está guardada en este navegador. No se envió ningún mensaje ni se reservó una cita.",
    again: "Iniciar otra conversación",
    view: "Ver en el panel del taller",
    error: "Revisa el campo resaltado.",
    saveError:
      "No pudimos guardar tu solicitud. El almacenamiento puede estar lleno o desactivado. Tus datos siguen aquí.",
    demo: "Demo guiada · Sin IA en vivo ni llamadas",
    pending: "Pendiente de confirmación del taller",
    preferred: "Visita preferida",
    newChat: "Nueva conversación",
  },
};
function Logo({ small = false }: { small?: boolean }) {
  return (
    <div className={"brand " + (small ? "small" : "")}>
      <span className="brandmark">
        A<span>↗</span>
      </span>
      {!small && (
        <span>
          autoflow<span className="ai">AI</span>
        </span>
      )}
    </div>
  );
}
function App() {
  const [page, setPage] = useState("Overview");
  const [leads, setLeads] = useState<Lead[]>([]);
  const [storageError, setStorageError] = useState(false);
  const [detail, setDetail] = useState<Lead | null>(null);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("All statuses");
  const [reset, setReset] = useState(false);
  const [toast, setToast] = useState("");
  const [mobile, setMobile] = useState(false);
  function load() {
    try {
      setLeads(repository.list());
      setStorageError(false);
    } catch {
      setStorageError(true);
    }
  }
  useEffect(() => {
    load();
    const listener = () => load();
    window.addEventListener("storage", listener);
    return () => window.removeEventListener("storage", listener);
  }, []);
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(""), 5000);
    return () => clearTimeout(t);
  }, [toast]);
  useEffect(() => {
    if (!detail && !reset) return;
    const previous = document.activeElement as HTMLElement | null;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setDetail(null);
        setReset(false);
      }
      if (event.key === "Tab") {
        const items = Array.from(
          document.querySelectorAll<HTMLElement>(
            ".modal button, .modal select, .modal a[href], .modal input",
          ),
        );
        const first = items[0],
          last = items[items.length - 1];
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last?.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first?.focus();
        }
      }
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
      previous?.focus();
    };
  }, [Boolean(detail), reset]);
  const stats = summarize(leads);
  const visible = leads.filter(
    (l) =>
      (filter === "All statuses" || l.status === filter) &&
      `${l.name} ${l.vehicle} ${services[l.service].en} ${services[l.service].es}`
        .toLowerCase()
        .includes(query.toLowerCase()),
  );
  function navigate(p: string) {
    setPage(p);
    setMobile(false);
    setDetail(null);
  }
  function updateStatus(lead: Lead, status: Status) {
    try {
      const updated = { ...lead, status };
      repository.replace(leads.map((l) => (l.id === lead.id ? updated : l)));
      load();
      setDetail(updated);
      setToast("Demo status updated. No calendar or message was sent.");
    } catch {
      setToast("Could not save. Check your browser storage.");
    }
  }
  function exportLeads() {
    const blob = new Blob([JSON.stringify(leads, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "autoflow-demo-leads.json";
    a.click();
    URL.revokeObjectURL(url);
    setToast("Demo leads exported.");
  }
  return (
    <div className="app">
      <aside className={"sidebar " + (mobile ? "mobile-open" : "")}>
        <Logo />
        <div className="workspace">
          <span className="workspace-icon">
            <Wrench size={17} />
          </span>
          <div>
            <strong>Miami Auto Care</strong>
            <small>Demo workspace</small>
          </div>
          <span className="online-dot" />
        </div>
        <div className="nav-label">WORKSPACE</div>
        <nav aria-label="Main navigation">
          {[
            { name: "Overview", icon: LayoutDashboard },
            { name: "Receptionist", icon: MessageSquare },
            { name: "Leads", icon: Users },
            { name: "Agent studio", icon: Workflow },
          ].map(({ name, icon: Icon }) => (
            <button
              key={name}
              className={page === name ? "active" : ""}
              onClick={() => navigate(name)}
            >
              <Icon size={19} />
              {name}
              {name === "Leads" && (
                <span className="nav-count">{stats.total}</span>
              )}
              {name === "Receptionist" && <span className="tiny-dot" />}
            </button>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <div className="build-card">
            <span className="build-icon">
              <Sparkles size={17} />
            </span>
            <strong>Small shop. Big possibilities.</strong>
            <p>Every lead deserves a great first impression.</p>
            <button onClick={() => navigate("Agent studio")}>
              Meet your agents <ArrowUpRight size={16} />
            </button>
          </div>
          <button className="settings-btn" onClick={() => navigate("Settings")}>
            <Settings2 size={18} />
            Demo settings
          </button>
          <a
            className="github-link"
            href="https://github.com/PabloMurillolo/autoflow-ai"
            target="_blank"
            rel="noreferrer"
          >
            Built by Pablo Murillo <ArrowUpRight size={14} />
          </a>
          <div className="profile">
            <span>PM</span>
            <div>
              <strong>Pablo Murillo</strong>
              <small>Workspace owner · Demo</small>
            </div>
          </div>
        </div>
      </aside>
      <div className="main-shell">
        <header className="topbar">
          <div className="breadcrumb">
            <button
              className="mobile-toggle"
              aria-label="Toggle navigation"
              onClick={() => setMobile(!mobile)}
            >
              <Menu size={22} />
            </button>
            <span>Workspace</span>
            <ChevronRight size={14} />
            <strong>{page}</strong>
          </div>
          <div className="top-actions">
            <span className="demo-pill">
              <span /> Interactive demo
            </span>
            <a
              href="https://github.com/PabloMurillolo/autoflow-ai#readme"
              target="_blank"
              rel="noreferrer"
              aria-label="Project documentation"
            >
              <CircleHelp size={20} />
            </a>
            <span className="mini-avatar">PM</span>
          </div>
        </header>
        <main>
          {storageError && (
            <div className="error-banner" role="alert">
              Saved demo data could not be loaded. Your existing data has not
              been overwritten. Enable browser storage or reset the demo in
              Settings.
            </div>
          )}
          {(page === "Overview" || page === "Leads") && (
            <>
              <div className="page-heading">
                <div>
                  <div className="eyebrow">YOUR SHOP, CONNECTED</div>
                  <h1>
                    {page === "Overview"
                      ? "A little less busywork."
                      : "Every conversation, connected."}
                  </h1>
                  <p>
                    {page === "Overview"
                      ? "A little more time for what you do best. Here’s your shop at a glance."
                      : "Service requests and the people behind them, all in one place."}
                  </p>
                </div>
                <button
                  className="primary"
                  onClick={() => navigate("Receptionist")}
                >
                  <Plus size={17} />
                  Try the receptionist
                </button>
              </div>
              {page === "Overview" && (
                <>
                  <section className="hero">
                    <div className="hero-copy">
                      <div className="hero-label">
                        <span /> YOUR FRONT DESK, REIMAGINED
                      </div>
                      <h2>
                        Hola. Hello.
                        <br />
                        You’re in good hands.
                      </h2>
                      <p>
                        Meet the bilingual receptionist that turns
                        <br className="desktop-break" /> “just a question” into
                        your next customer.
                      </p>
                      <button onClick={() => navigate("Receptionist")}>
                        Start a conversation <ArrowUpRight size={18} />
                      </button>
                      <div className="hero-foot">
                        <Globe2 size={14} /> English & Español <span>·</span>{" "}
                        Built for Miami
                      </div>
                    </div>
                    <div className="conversation-preview">
                      <div className="conversation-head">
                        <span className="assistant-orb">
                          <Sparkles size={18} />
                        </span>
                        <div>
                          <strong>AutoFlow receptionist</strong>
                          <small>
                            <span /> Guided demo
                          </small>
                        </div>
                        <span className="chat-language">EN / ES</span>
                      </div>
                      <div className="bubble customer">
                        Hola, necesito cambiar los frenos
                        <br />
                        de mi Honda Accord.
                      </div>
                      <div className="bubble assistant">
                        ¡Claro! Te ayudo con eso. 🚘
                        <br />
                        ¿Qué día te gustaría visitarnos?
                      </div>
                      <div className="preview-request">
                        <span>
                          <Check size={15} />
                        </span>
                        <div>
                          <strong>From conversation to connection</strong>
                          <small>Service details → appointment request</small>
                        </div>
                      </div>
                    </div>
                    <span className="hero-circle one" />
                    <span className="hero-circle two" />
                  </section>
                  <section className="metrics" aria-label="Lead summary">
                    {[
                      {
                        label: "Total leads",
                        value: stats.total,
                        icon: Users,
                        foot: "All requests in this browser",
                        tone: "green",
                      },
                      {
                        label: "Needs a follow-up",
                        value: stats.open,
                        icon: MessageSquare,
                        foot: "New conversations to pick up",
                        tone: "orange",
                      },
                      {
                        label: "Marked scheduled",
                        value: stats.scheduled,
                        icon: CalendarDays,
                        foot: "Demo status · no live calendar",
                        tone: "blue",
                      },
                      {
                        label: "Spanish conversations",
                        value: stats.spanish,
                        icon: Globe2,
                        foot: "Connection in their language",
                        tone: "purple",
                      },
                    ].map(({ label, value, icon: Icon, foot, tone }) => (
                      <article className="metric" key={label}>
                        <div>
                          <span>{label}</span>
                          <span className={"metric-icon " + tone}>
                            <Icon size={17} />
                          </span>
                        </div>
                        <strong>{value.toString().padStart(2, "0")}</strong>
                        <small>{foot}</small>
                      </article>
                    ))}
                  </section>
                </>
              )}
              <div className={page === "Overview" ? "overview-grid" : ""}>
                <section className="panel leads-panel">
                  <div className="panel-heading">
                    <div>
                      <h2>
                        {page === "Overview"
                          ? "Latest conversations"
                          : "Lead inbox"}{" "}
                        <span className="count">{leads.length}</span>
                      </h2>
                      <p>A warm welcome is just the beginning.</p>
                    </div>
                    {page === "Overview" ? (
                      <button
                        className="text-button"
                        onClick={() => navigate("Leads")}
                      >
                        View all <ArrowRight size={15} />
                      </button>
                    ) : (
                      <button className="secondary" onClick={exportLeads}>
                        <Download size={15} />
                        Export JSON
                      </button>
                    )}
                  </div>
                  <div className="table-tools">
                    <label className="search">
                      <Search size={17} />
                      <input
                        aria-label="Search leads"
                        placeholder="Search name, vehicle, or service…"
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                      />
                    </label>
                    <select
                      aria-label="Filter by status"
                      value={filter}
                      onChange={(e) => setFilter(e.target.value)}
                    >
                      <option>All statuses</option>
                      <option>New</option>
                      <option>Contacted</option>
                      <option>Scheduled</option>
                    </select>
                  </div>
                  <div className="table-scroll">
                    <table>
                      <thead>
                        <tr>
                          <th>Customer</th>
                          <th>Service & vehicle</th>
                          <th>Status</th>
                          <th>Language</th>
                          <th>
                            <span className="sr-only">Details</span>
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {visible
                          .slice(0, page === "Overview" ? 4 : undefined)
                          .map((lead, i) => (
                            <tr key={lead.id}>
                              <td>
                                <button
                                  className="customer-button"
                                  onClick={() => setDetail(lead)}
                                >
                                  <span
                                    className={
                                      "customer-avatar color-" + (i % 4)
                                    }
                                  >
                                    {lead.name
                                      .split(" ")
                                      .map((n) => n[0])
                                      .slice(0, 2)
                                      .join("")}
                                  </span>
                                  <span>
                                    <strong>{lead.name}</strong>
                                    <small>
                                      {lead.sample
                                        ? "Sample lead"
                                        : "Demo request"}
                                    </small>
                                  </span>
                                </button>
                              </td>
                              <td>
                                <strong>{services[lead.service].en}</strong>
                                <small>{lead.vehicle}</small>
                              </td>
                              <td>
                                <span
                                  className={
                                    "status " + lead.status.toLowerCase()
                                  }
                                >
                                  <span />
                                  {lead.status}
                                </span>
                              </td>
                              <td>
                                <span className="language-tag">
                                  {lead.language === "es"
                                    ? "ES · Español"
                                    : "EN · English"}
                                </span>
                              </td>
                              <td>
                                <button
                                  className="icon-button"
                                  aria-label={"View " + lead.name}
                                  onClick={() => setDetail(lead)}
                                >
                                  <ArrowUpRight size={17} />
                                </button>
                              </td>
                            </tr>
                          ))}
                      </tbody>
                    </table>
                    {!visible.length && (
                      <div className="empty">
                        <MessageSquare />
                        <h3>
                          {leads.length
                            ? "No matching conversations"
                            : "Your next connection starts here."}
                        </h3>
                        <p>
                          {leads.length
                            ? "Try a different name or status."
                            : "Try the receptionist to capture your first demo lead."}
                        </p>
                        <button
                          className="secondary"
                          onClick={() =>
                            leads.length
                              ? (setQuery(""), setFilter("All statuses"))
                              : navigate("Receptionist")
                          }
                        >
                          {leads.length
                            ? "Clear filters"
                            : "Start a conversation"}
                        </button>
                      </div>
                    )}
                  </div>
                  <div className="table-footer">
                    <span className="online-dot" /> Saved locally in your
                    browser <span>Fictional data only</span>
                  </div>
                </section>
                {page === "Overview" && (
                  <section className="panel team-panel">
                    <div className="panel-heading">
                      <div>
                        <h2>Your growing team</h2>
                        <p>One connected vision.</p>
                      </div>
                      <Workflow size={20} />
                    </div>
                    <div className="agent-row">
                      <span className="agent-icon green">
                        <MessageSquare size={19} />
                      </span>
                      <div>
                        <strong>Receptionist</strong>
                        <small>Welcomes. Collects. Connects.</small>
                      </div>
                      <span className="ready">Demo</span>
                    </div>
                    {[
                      {
                        name: "Marketing",
                        desc: "Content that brings people in.",
                        icon: Sparkles,
                      },
                      {
                        name: "Analytics",
                        desc: "See what moves your shop.",
                        icon: LayoutDashboard,
                      },
                    ].map(({ name, desc, icon: Icon }) => (
                      <div className="agent-row" key={name}>
                        <span className="agent-icon muted">
                          <Icon size={19} />
                        </span>
                        <div>
                          <strong>{name}</strong>
                          <small>{desc}</small>
                        </div>
                        <span className="planned">Next</span>
                      </div>
                    ))}
                    <div className="team-note">
                      <span>ON THE ROADMAP</span>
                      <p>
                        From first hello to your next campaign. Built to grow
                        with your business.
                      </p>
                      <button
                        className="text-button"
                        onClick={() => navigate("Agent studio")}
                      >
                        Explore the agent studio <ArrowRight size={15} />
                      </button>
                    </div>
                  </section>
                )}
              </div>
            </>
          )}
          {page === "Receptionist" && (
            <Receptionist
              onSaved={() => {
                load();
              }}
              onDashboard={() => navigate("Leads")}
            />
          )}
          {page === "Agent studio" && (
            <>
              <div className="page-heading">
                <div className="eyebrow">BUILT TO GROW</div>
                <h1>A small team. A shared purpose.</h1>
                <p>
                  Start with a great welcome. Build toward a connected business.
                </p>
              </div>
              <section className="studio-grid">
                {[
                  {
                    name: "Manager",
                    state: "Working demo",
                    desc: "Validates every request and hands it to the lead repository. The foundation for future orchestration.",
                    icon: Workflow,
                  },
                  {
                    name: "Receptionist",
                    state: "Working demo",
                    desc: "English and Spanish service intake, vehicle details, contact information, and appointment requests.",
                    icon: MessageSquare,
                  },
                  {
                    name: "Marketing",
                    state: "Planned",
                    desc: "Turn approved service offers into bilingual campaign drafts. Higgsfield will power image and video generation.",
                    icon: Sparkles,
                  },
                  {
                    name: "Analytics",
                    state: "Basic metrics live",
                    desc: "Lead totals and status counts work today. Campaign attribution and trends are on the roadmap.",
                    icon: LayoutDashboard,
                  },
                ].map(({ name, state, desc, icon: Icon }) => (
                  <article className="panel studio-card" key={name}>
                    <span className="agent-icon green">
                      <Icon size={24} />
                    </span>
                    <span className="studio-state">{state}</span>
                    <h2>{name} agent</h2>
                    <p>{desc}</p>
                  </article>
                ))}
              </section>
              <section className="panel integration-panel">
                <h2>The next connections</h2>
                <p>
                  Interfaces are ready in the codebase. No external services are
                  connected.
                </p>
                <div className="integration-grid">
                  {[
                    ["Higgsfield", "Generate campaign images & video"],
                    ["Calendar", "Check availability & confirm bookings"],
                    ["SMS", "Consent-based confirmations & follow-ups"],
                    ["CRM", "Sync qualified leads & customer history"],
                  ].map(([title, desc]) => (
                    <div key={title}>
                      <strong>{title}</strong>
                      <p>{desc}</p>
                      <span className="planned">Planned integration</span>
                    </div>
                  ))}
                </div>
              </section>
            </>
          )}
          {page === "Settings" && (
            <>
              <div className="page-heading">
                <div>
                  <div className="eyebrow">MAKE YOURSELF AT HOME</div>
                  <h1>Your demo workspace.</h1>
                  <p>A safe place to explore how AutoFlow works.</p>
                </div>
              </div>
              <section className="panel settings-panel">
                <h2>What’s connected?</h2>
                <p>
                  This portfolio demo uses a rule-based bilingual assistant and
                  browser storage. No live AI model, calendar, SMS, CRM, or
                  Higgsfield account is connected. The owner dashboard is public
                  and has no authentication.
                </p>
                <p>
                  Use fictional details only. Records stay in this browser and
                  are not shared between devices. Clearing browser data removes
                  them. Appointment requests do not reserve a time.
                </p>
                <div className="settings-actions">
                  <button className="secondary" onClick={exportLeads}>
                    <Download size={16} />
                    Export demo leads
                  </button>
                  <button className="secondary" onClick={() => setReset(true)}>
                    <RotateCcw size={16} />
                    Reset demo
                  </button>
                </div>
                <a
                  href="https://github.com/PabloMurillolo/autoflow-ai#roadmap"
                  target="_blank"
                  rel="noreferrer"
                >
                  Explore the roadmap ↗
                </a>
              </section>
            </>
          )}
          <footer className="main-footer">
            <span>
              <Logo small /> Thoughtfully built for the businesses that keep
              Miami moving.
            </span>
            <span>
              AutoFlow AI <b>v0.1</b>
            </span>
          </footer>
        </main>
      </div>
      {detail && (
        <div className="modal-backdrop" onClick={() => setDetail(null)}>
          <section
            className="modal"
            role="dialog"
            aria-modal="true"
            aria-label="Lead details"
            onClick={(e) => e.stopPropagation()}
            onKeyDown={(e) => {
              if (e.key === "Escape") setDetail(null);
            }}
          >
            <button
              className="close"
              aria-label="Close details"
              autoFocus
              onClick={() => setDetail(null)}
            >
              <X />
            </button>
            <div className="eyebrow">
              {detail.sample ? "SAMPLE LEAD" : "DEMO REQUEST"}
            </div>
            <h2>{detail.name}</h2>
            <p>{detail.contact}</p>
            <dl>
              <dt>Vehicle</dt>
              <dd>{detail.vehicle}</dd>
              <dt>Service</dt>
              <dd>{services[detail.service].en}</dd>
              <dt>Preferred visit · Miami time</dt>
              <dd>
                {detail.date} · {detail.time}
              </dd>
              <dt>Language</dt>
              <dd>{detail.language === "es" ? "Español" : "English"}</dd>
              <dt>Notes</dt>
              <dd>{detail.notes || "No additional notes"}</dd>
            </dl>
            <label className="field">
              Demo status
              <select
                value={detail.status}
                onChange={(e) => updateStatus(detail, e.target.value as Status)}
              >
                <option>New</option>
                <option>Contacted</option>
                <option>Scheduled</option>
              </select>
            </label>
            <p className="fine-print">
              Changing status only updates this demo. It does not book, contact,
              or send messages to anyone.
            </p>
            <button className="primary" onClick={() => setDetail(null)}>
              Done
            </button>
          </section>
        </div>
      )}
      {reset && (
        <div className="modal-backdrop">
          <section
            className="modal"
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="reset-title"
          >
            <h2 id="reset-title">Start fresh?</h2>
            <p>
              This replaces this browser’s demo leads with four fictional
              samples. Export your demo leads first if you want to keep a copy.
            </p>
            <div className="settings-actions">
              <button
                autoFocus
                className="secondary"
                onClick={() => setReset(false)}
              >
                Keep my leads
              </button>
              <button
                className="primary"
                onClick={() => {
                  try {
                    repository.replace(seedLeads());
                    load();
                    setReset(false);
                    setToast("Demo reset to four sample leads.");
                  } catch {
                    setToast("Browser storage is unavailable.");
                  }
                }}
              >
                Reset demo leads
              </button>
            </div>
          </section>
        </div>
      )}
      {toast && (
        <div className="toast" role="status">
          <CheckCircle2 size={18} />
          {toast}
        </div>
      )}
    </div>
  );
}
export function Receptionist({
  onSaved,
  onDashboard,
  backend,
}: {
  onSaved: () => void;
  onDashboard: () => void;
  backend?: {
    shopName: string;
    retentionDays: number;
    submit: (data: Intake) => Promise<Lead>;
  };
}) {
  const [lang, setLang] = useState<Language>("en");
  const [manualLang, setManualLang] = useState(false);
  const [step, setStep] = useState(0);
  const [message, setMessage] = useState("");
  const [consent, setConsent] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState<Lead | null>(null);
  const [data, setData] = useState<Intake>({
    name: "",
    contact: "",
    vehicle: "",
    service: "diagnostic",
    notes: "",
    language: "en",
    date: nextDay(),
    time: "Morning",
  });
  const [saving, setSaving] = useState(false);
  const savingRef = useRef(false);
  const t = { ...copy[lang] };
  if (backend) {
    t.intro = t.intro.replace("Miami Auto Care", backend.shopName);
    t.greet =
      lang === "en"
        ? "Hi! I’m the AutoFlow guided assistant. What can we help you with today?"
        : "¡Hola! Soy el asistente guiado de AutoFlow. ¿En qué podemos ayudarte?";
    t.consent =
      lang === "en"
        ? `I agree to send these details to ${backend.shopName} for this service request. Stored for up to ${backend.retentionDays} days; no SMS consent is implied.`
        : `Acepto enviar estos datos a ${backend.shopName} para esta solicitud. Se guardan hasta ${backend.retentionDays} días; esto no autoriza SMS.`;
    t.successDesc =
      lang === "en"
        ? "Your request is saved for the shop owner to review. No appointment is confirmed and no SMS was sent."
        : "Tu solicitud está guardada para que el taller la revise. No se ha confirmado ninguna cita ni enviado SMS.";
    t.saveError =
      lang === "en"
        ? "We couldn’t save your request. Check your connection and details, then try again. Your details are still here."
        : "No pudimos guardar la solicitud. Revisa tu conexión y los datos e inténtalo de nuevo. Tus datos siguen aquí.";
    t.view = lang === "en" ? "Owner sign-in" : "Acceso del taller";
    t.demo =
      lang === "en"
        ? "Guided assistant · No live AI or phone calls"
        : "Asistente guiado · Sin IA en vivo ni llamadas";
  }
  function begin(text: string) {
    const parsed = understandRequest(text);
    const language = manualLang ? lang : parsed.language;
    setLang(language);
    setMessage(text);
    setData({ ...data, ...parsed, language });
    setError("");
    setStep(1);
  }
  function startOver() {
    if (savingRef.current) return;
    setStep(0);
    setMessage("");
    setSaved(null);
    setConsent(false);
    setError("");
    setData({
      name: "",
      contact: "",
      vehicle: "",
      service: "diagnostic",
      notes: "",
      language: lang,
      date: nextDay(),
      time: "Morning",
    });
  }
  const change = (key: keyof Intake, value: string) => {
    setData({ ...data, [key]: value });
    setError("");
  };
  return (
    <div className="receptionist-page" lang={lang}>
      <div className="receptionist-top">
        <span className="eyebrow">
          {backend ? backend.shopName : "MIAMI AUTO CARE · DEMO"}
        </span>
        <div className="language-switch" aria-label="Assistant language">
          <button
            aria-pressed={lang === "en"}
            className={lang === "en" ? "selected" : ""}
            onClick={() => {
              setLang("en");
              setManualLang(true);
              setData({ ...data, language: "en" });
            }}
          >
            English
          </button>
          <button
            aria-pressed={lang === "es"}
            className={lang === "es" ? "selected" : ""}
            onClick={() => {
              setLang("es");
              setManualLang(true);
              setData({ ...data, language: "es" });
            }}
          >
            Español
          </button>
        </div>
      </div>
      <div className="receptionist-layout">
        <div className="receptionist-intro">
          <div className="large-orb">
            <MessageSquare size={35} />
            <span>
              <Sparkles size={15} />
            </span>
          </div>
          <h1>{t.title}</h1>
          <p>{t.intro}</p>
          <div className="shop-detail">
            <CarFront size={19} />
            <div>
              <strong>{backend?.shopName || "Miami Auto Care"}</strong>
              <span>
                {backend
                  ? lang === "en"
                    ? "Service requests for your local shop"
                    : "Solicitudes para tu taller local"
                  : lang === "en"
                    ? "Fictional neighborhood auto shop"
                    : "Taller de demostración ficticio"}
              </span>
            </div>
          </div>
          <div className="shop-detail">
            <Clock3 size={19} />
            <div>
              <strong>
                {lang === "en"
                  ? "Requests, on your schedule"
                  : "Solicitudes a tu ritmo"}
              </strong>
              <span>
                {lang === "en"
                  ? "Preferred times in Miami · Eastern time"
                  : "Horarios de Miami · Hora del Este"}
              </span>
            </div>
          </div>
          <div className="local-note">
            <Globe2 size={18} />
            <p>
              {lang === "en"
                ? "In English, en español, or a little of both. A welcome that feels like home."
                : "En español, in English, o un poco de ambos. Una bienvenida como en casa."}
            </p>
          </div>
          <span className="demo-disclaimer">{t.demo}</span>
        </div>
        <section className="intake-card">
          <div className="intake-header">
            <div>
              <span className="online-dot" />
              <strong>
                {lang === "en"
                  ? "Your front desk assistant"
                  : "Tu asistente de recepción"}
              </strong>
            </div>
            {step > 0 && (
              <button
                className="text-button"
                onClick={startOver}
                aria-label={t.newChat}
              >
                <RotateCcw size={16} />
              </button>
            )}
          </div>
          <div className="steps">
            {(lang === "en"
              ? ["Your service", "Your details", "Review"]
              : ["Tu servicio", "Tus datos", "Revisar"]
            ).map((label, i) => (
              <div key={label} className={step >= i ? "current" : ""}>
                <span>{step > i ? <Check size={12} /> : i + 1}</span>
                {label}
              </div>
            ))}
          </div>
          <div className="intake-body">
            {step === 0 && (
              <>
                <div className="assistant-message">
                  <span className="assistant-orb">
                    <Sparkles size={17} />
                  </span>
                  <p>{t.greet}</p>
                </div>
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    if (message.trim()) begin(message.trim());
                  }}
                >
                  <label className="sr-only" htmlFor="request">
                    {lang === "en"
                      ? "Describe your service request"
                      : "Describe tu solicitud"}
                  </label>
                  <textarea
                    id="request"
                    required
                    maxLength={1000}
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder={t.placeholder}
                    rows={4}
                  />
                  <button
                    className="primary full"
                    type="submit"
                    disabled={!message.trim()}
                  >
                    {t.send}
                    <Send size={17} />
                  </button>
                </form>
                <div className="quick-label">
                  {lang === "en"
                    ? "OR START WITH A SERVICE"
                    : "O ELIGE UN SERVICIO"}
                </div>
                <div className="service-buttons">
                  {Object.entries(services).map(([key, label]) => (
                    <button
                      key={key}
                      onClick={() => {
                        setData({
                          ...data,
                          service: key as Service,
                          language: lang,
                        });
                        setMessage(label[lang]);
                        setStep(1);
                      }}
                    >
                      <Wrench size={15} />
                      {label[lang]}
                      <ArrowUpRight size={14} />
                    </button>
                  ))}
                </div>
                <p className="fine-print">
                  {backend
                    ? lang === "en"
                      ? `Your details go to ${backend.shopName} and are kept for up to ${backend.retentionDays} days. Contact the shop to request deletion. No marketing or SMS opt-in.`
                      : `Tus datos se envían a ${backend.shopName} y se guardan hasta ${backend.retentionDays} días. Contacta al taller para eliminarlos. No autoriza marketing ni SMS.`
                    : lang === "en"
                      ? "Portfolio demo. Use fictional details only. Nothing is sent to a real shop."
                      : "Demo de portafolio. Usa solo datos ficticios. No se envía nada a un taller real."}
                </p>
              </>
            )}
            {step === 1 && (
              <>
                <h2>{t.details}</h2>
                <p className="form-intro">{t.desc}</p>
                {message && <div className="request-quote">“{message}”</div>}
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    setError("");
                    setStep(2);
                  }}
                >
                  <div className="form-grid">
                    <label className="field">
                      {t.name}
                      <input
                        autoComplete="off"
                        required
                        minLength={2}
                        maxLength={80}
                        value={data.name}
                        onChange={(e) => change("name", e.target.value)}
                        placeholder="Alex Rivera"
                      />
                    </label>
                    <label className="field">
                      {t.contact}
                      <input
                        autoComplete="off"
                        required
                        maxLength={160}
                        value={data.contact}
                        onChange={(e) => change("contact", e.target.value)}
                        placeholder="alex@example.com"
                      />
                    </label>
                    <label className="field">
                      {t.vehicle}
                      <input
                        required
                        minLength={3}
                        maxLength={100}
                        value={data.vehicle}
                        onChange={(e) => change("vehicle", e.target.value)}
                        placeholder="2020 Honda Accord"
                      />
                    </label>
                    <label className="field">
                      {t.service}
                      <select
                        value={data.service}
                        onChange={(e) => change("service", e.target.value)}
                      >
                        {Object.entries(services).map(([key, label]) => (
                          <option key={key} value={key}>
                            {label[lang]}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className="field">
                      {t.date}
                      <input
                        type="date"
                        required
                        min={nextDay()}
                        value={data.date}
                        onChange={(e) => change("date", e.target.value)}
                      />
                    </label>
                    <label className="field">
                      {t.time}
                      <select
                        value={data.time}
                        onChange={(e) => change("time", e.target.value)}
                      >
                        <option value="Morning">{t.morning}</option>
                        <option value="Afternoon">{t.afternoon}</option>
                      </select>
                    </label>
                  </div>
                  <label className="field">
                    {t.notes}
                    <textarea
                      maxLength={1000}
                      rows={2}
                      value={data.notes}
                      onChange={(e) => change("notes", e.target.value)}
                    />
                  </label>
                  <label className="consent">
                    <input
                      type="checkbox"
                      required
                      checked={consent}
                      onChange={(e) => setConsent(e.target.checked)}
                    />
                    {t.consent}
                  </label>
                  <button className="primary full" type="submit">
                    {t.review}
                    <ArrowRight size={16} />
                  </button>
                </form>
              </>
            )}
            {step === 2 && (
              <>
                <h2>{t.reviewTitle}</h2>
                <p className="form-intro">{t.reviewDesc}</p>
                <div className="review-card">
                  <div>
                    <Wrench />
                    <strong>{services[data.service][lang]}</strong>
                  </div>
                  <dl>
                    <dt>{t.name}</dt>
                    <dd>{data.name}</dd>
                    <dt>{t.contact}</dt>
                    <dd>{data.contact}</dd>
                    <dt>{t.vehicle}</dt>
                    <dd>{data.vehicle}</dd>
                    <dt>{t.preferred}</dt>
                    <dd>
                      {data.date} ·{" "}
                      {data.time === "Morning" ? t.morning : t.afternoon}
                    </dd>
                    <dt>{t.notes}</dt>
                    <dd>{data.notes || "—"}</dd>
                  </dl>
                </div>
                {error && (
                  <p className="error-banner" role="alert">
                    {error}
                  </p>
                )}
                <button
                  className="primary full"
                  disabled={saving}
                  onClick={async () => {
                    if (savingRef.current) return;
                    savingRef.current = true;
                    setSaving(true);
                    setError("");
                    try {
                      const input = { ...data, language: lang };
                      const lead = backend
                        ? await backend.submit(input)
                        : captureRequest(input, repository);
                      setSaved(lead);
                      onSaved();
                      setStep(3);
                    } catch (e) {
                      const key = e instanceof Error ? e.message : "";
                      const labels: Record<string, string> = {
                        name: t.name,
                        contact: t.contact,
                        vehicle: t.vehicle,
                        date: t.date,
                        time: t.time,
                        service: t.service,
                        notes: t.notes,
                      };
                      setError(
                        labels[key]
                          ? `${lang === "en" ? "Please check" : "Revisa"}: ${labels[key]}. ${key === "date" ? (lang === "en" ? "Choose a future date." : "Elige una fecha futura.") : ""}`
                          : t.saveError,
                      );
                    } finally {
                      savingRef.current = false;
                      setSaving(false);
                    }
                  }}
                >
                  {saving
                    ? lang === "en"
                      ? "Saving request…"
                      : "Guardando solicitud…"
                    : t.submit}
                  <ArrowRight size={16} />
                </button>
                <button
                  className="text-button back-button"
                  disabled={saving}
                  onClick={() => {
                    setError("");
                    setStep(1);
                  }}
                >
                  ← {t.back}
                </button>
              </>
            )}
            {step === 3 && (
              <div className="success-state" role="status">
                <div className="success-icon">
                  <Check size={34} />
                </div>
                <span className="eyebrow">{t.pending}</span>
                <h2>{t.success}</h2>
                <p>{t.successDesc}</p>
                <div className="success-summary">
                  <strong>{services[data.service][lang]}</strong>
                  <span>
                    {data.date} ·{" "}
                    {data.time === "Morning" ? t.morning : t.afternoon}
                  </span>
                  <small>#{saved?.id.slice(0, 8).toUpperCase()}</small>
                </div>
                <button className="primary full" onClick={onDashboard}>
                  {t.view}
                  <ArrowRight size={16} />
                </button>
                <button className="text-button back-button" onClick={startOver}>
                  {t.again}
                </button>
              </div>
            )}
          </div>
          <div className="intake-footer">
            <Logo small />
            <span>
              {lang === "en"
                ? "A warmer welcome, powered by AutoFlow."
                : "Una cálida bienvenida con AutoFlow."}
            </span>
          </div>
        </section>
      </div>
    </div>
  );
}
export default App;
