import { useState, useEffect, useRef } from "react";
import {
  ShieldCheck,
  LogOut,
  ArrowLeft,
  RefreshCw,
  Search,
  Users,
  CalendarDays,
  Globe2,
  MessageSquare,
  Trash2,
  ArrowRight,
} from "lucide-react";
import { Receptionist } from "./App";
import { AiReceptionist, KnowledgeSettings } from "./AiReceptionist";
import {
  backendApi,
  api,
  ApiError,
  type OwnerSession,
  type ShopConfig,
  type LeadPage,
} from "./integrations/api";
import { services, type Lead, type Intake, type Status } from "./domain";
export default function BackendApp() {
  const [shop, setShop] = useState<ShopConfig | null>(null),
    [session, setSession] = useState<OwnerSession | null>(null),
    [ready, setReady] = useState(false),
    [screen, setScreen] = useState<"chat" | "intake" | "login" | "dashboard">(
      "chat",
    ),
    [error, setError] = useState("");
  const pending = useRef<{ payload: string; key: string } | null>(null);
  const [draft, setDraft] = useState<Partial<Intake> | undefined>();
  useEffect(() => {
    const slug = new URLSearchParams(location.search).get("shop") || "";
    Promise.all([
      backendApi.config(slug),
      backendApi.session().catch((e) => {
        if (e instanceof ApiError && e.status === 401) return null;
        throw e;
      }),
    ])
      .then(([config, user]) => {
        setShop(config);
        setSession(user);
      })
      .catch(() =>
        setError(
          "The workspace is unavailable. Check that the server is configured, then reload.",
        ),
      )
      .finally(() => setReady(true));
  }, []);
  async function submit(data: Intake) {
    const payload = JSON.stringify(data);
    if (!pending.current || pending.current.payload !== payload)
      pending.current = { payload, key: crypto.randomUUID() };
    const lead = await backendApi.create(shop!.slug, data, pending.current.key);
    pending.current = null;
    return lead;
  }
  async function logout() {
    try {
      await backendApi.logout(session!.csrf);
      setSession(null);
      setScreen("intake");
      setError("");
    } catch {
      setError(
        "Sign-out failed. Check your connection and retry; your session may still be active.",
      );
    }
  }
  function expired() {
    setSession(null);
    setScreen("login");
    setError("Your session expired. Sign in again.");
  }
  return (
    <div className="server-app">
      <header className="server-header">
        <a href="/" className="server-brand">
          autoflow<span>AI</span>
        </a>
        <span className="demo-pill">
          <ShieldCheck size={14} /> Private workspace · v0.3
        </span>
        <div>
          {screen !== "chat" && (
            <button className="text-button" onClick={() => setScreen("chat")}>
              <ArrowLeft size={14} />
              Receptionist
            </button>
          )}
          {session ? (
            <>
              <button
                className="secondary"
                onClick={() => setScreen("dashboard")}
              >
                Owner dashboard
              </button>
              <button className="secondary" onClick={logout}>
                <LogOut size={14} />
                Sign out
              </button>
            </>
          ) : (
            <button
              className="primary"
              onClick={() => {
                setError("");
                setScreen("login");
              }}
            >
              Owner sign-in
            </button>
          )}
        </div>
      </header>
      <main className="server-main">
        {error && (
          <div className="error-banner" role="alert">
            {error}
          </div>
        )}
        {!ready ? (
          <p role="status">Connecting to your workspace…</p>
        ) : !shop ? (
          <button className="secondary" onClick={() => location.reload()}>
            Reload workspace
          </button>
        ) : screen === "chat" ? (
          <AiReceptionist
            key={shop.slug}
            shop={shop.slug}
            onForm={(value) => {
              setDraft(value);
              setScreen("intake");
            }}
          />
        ) : screen === "intake" ? (
          <Receptionist
            key={shop.slug}
            initialDraft={draft}
            backend={{
              shopName: shop.name,
              retentionDays: shop.retentionDays,
              submit,
            }}
            onSaved={() => {}}
            onDashboard={() => setScreen(session ? "dashboard" : "login")}
          />
        ) : screen === "login" ? (
          <Login
            shop={shop.slug}
            onSuccess={(user) => {
              setSession(user);
              setError("");
              setScreen("dashboard");
            }}
          />
        ) : session ? (
          <OwnerDashboard
            session={session}
            retentionDays={shop.retentionDays}
            expired={expired}
          />
        ) : (
          <Login
            shop={shop.slug}
            onSuccess={(user) => {
              setSession(user);
              setScreen("dashboard");
            }}
          />
        )}
      </main>
    </div>
  );
}
function Login({
  shop,
  onSuccess,
}: {
  shop: string;
  onSuccess: (session: OwnerSession) => void;
}) {
  const [slug, setSlug] = useState(shop),
    [email, setEmail] = useState(""),
    [password, setPassword] = useState(""),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  return (
    <section className="panel login-card">
      <span className="agent-icon green">
        <ShieldCheck size={25} />
      </span>
      <div className="eyebrow">FOR SHOP OWNERS</div>
      <h1>Your shop. Your workspace.</h1>
      <p>Sign in to review requests and follow up with your customers.</p>
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          if (busy) return;
          setBusy(true);
          setError("");
          try {
            onSuccess(await backendApi.login(slug, email, password));
            setPassword("");
          } catch (e) {
            setError(
              e instanceof ApiError
                ? e.message
                : "Could not connect. Please try again.",
            );
          } finally {
            setBusy(false);
          }
        }}
      >
        <label className="field">
          Shop code
          <input
            required
            maxLength={64}
            value={slug}
            onChange={(e) => setSlug(e.target.value)}
            autoComplete="organization"
          />
        </label>
        <label className="field">
          Email
          <input
            type="email"
            required
            maxLength={160}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="username"
          />
        </label>
        <label className="field">
          Password
          <input
            type="password"
            required
            maxLength={128}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
          />
        </label>
        {error && (
          <p className="error-banner" role="alert">
            {error}
          </p>
        )}
        <button className="primary full" disabled={busy}>
          {busy ? "Signing in…" : "Sign in securely"}
          <ArrowRight size={17} />
        </button>
      </form>
      <p className="fine-print">
        Accounts are provisioned by the workspace operator. Contact your
        administrator for access or a password reset. Sessions expire after
        eight hours.
      </p>
    </section>
  );
}
function OwnerDashboard({
  session,
  retentionDays,
  expired,
}: {
  session: OwnerSession;
  retentionDays: number;
  expired: () => void;
}) {
  const [page, setPage] = useState<LeadPage>({
      items: [],
      total: 0,
      nextOffset: null,
    }),
    [stats, setStats] = useState({
      total: 0,
      open: 0,
      scheduled: 0,
      spanish: 0,
    }),
    [query, setQuery] = useState(""),
    [filter, setFilter] = useState(""),
    [offset, setOffset] = useState(0),
    [refresh, setRefresh] = useState(0),
    [loading, setLoading] = useState(true),
    [error, setError] = useState(""),
    [notice, setNotice] = useState(""),
    [selected, setSelected] = useState<Lead | null>(null),
    [deleting, setDeleting] = useState(false),
    [busy, setBusy] = useState(false);
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    if (selected && !dialog.current?.open) dialog.current?.showModal();
    if (!selected && dialog.current?.open) dialog.current.close();
  }, [selected]);
  useEffect(() => {
    const controller = new AbortController();
    let active = true;
    setLoading(true);
    setError("");
    const timer = setTimeout(() => {
      Promise.all([
        backendApi.list(query, filter, offset, controller.signal),
        backendApi.stats(),
      ])
        .then(([leads, summary]) => {
          if (active) {
            setPage(leads);
            setStats(summary);
          }
        })
        .catch((e) => {
          if (!active) return;
          if (e instanceof ApiError && e.status === 401) {
            expired();
            return;
          }
          setError("Could not load leads. Refresh to retry.");
        })
        .finally(() => {
          if (active) setLoading(false);
        });
    }, 200);
    return () => {
      active = false;
      clearTimeout(timer);
      controller.abort();
    };
  }, [query, filter, offset, refresh, session.shopSlug]);
  async function change(status: Status) {
    if (!selected || busy) return;
    setBusy(true);
    setError("");
    try {
      setSelected(await backendApi.update(selected.id, status, session.csrf));
      setRefresh((v) => v + 1);
      setNotice("Status saved. No calendar booking or message was sent.");
    } catch (e) {
      if (e instanceof ApiError && e.status === 401) expired();
      else setError("Could not update status. Try again.");
    } finally {
      setBusy(false);
    }
  }
  async function remove() {
    if (!selected || busy) return;
    setBusy(true);
    setError("");
    try {
      await backendApi.remove(selected.id, session.csrf);
      setSelected(null);
      setDeleting(false);
      setOffset(0);
      setRefresh((v) => v + 1);
      setNotice(
        "Lead deleted from the active database. Backups expire separately.",
      );
    } catch (e) {
      if (e instanceof ApiError && e.status === 401) expired();
      else setError("Could not delete the lead. Try again.");
    } finally {
      setBusy(false);
    }
  }
  async function exportData() {
    try {
      const data = await api<Lead[]>("/leads/export");
      const url = URL.createObjectURL(
        new Blob([JSON.stringify(data, null, 2)], { type: "application/json" }),
      );
      const a = document.createElement("a");
      a.href = url;
      a.download = "autoflow-leads.json";
      a.click();
      URL.revokeObjectURL(url);
      setNotice("Export downloaded. Store customer information securely.");
    } catch (e) {
      if (e instanceof ApiError && e.status === 401) expired();
      else setError("Export failed. Please try again.");
    }
  }
  return (
    <>
      <div className="page-heading">
        <div>
          <div className="eyebrow">OWNER WORKSPACE</div>
          <h1>{session.shopName}</h1>
          <p>
            Welcome back, {session.email}. Your customer requests are private to
            your shop.
          </p>
        </div>
        <button
          className="secondary"
          onClick={() => setRefresh((v) => v + 1)}
          disabled={loading}
        >
          <RefreshCw size={16} />
          Refresh leads
        </button>
      </div>
      <KnowledgeSettings session={session} expired={expired} />
      {error && (
        <p className="error-banner" role="alert">
          {error}
        </p>
      )}
      {notice && (
        <p className="server-notice" role="status">
          {notice}
        </p>
      )}
      <section className="metrics">
        {[
          { label: "Total requests", value: stats.total, icon: Users },
          { label: "Needs follow-up", value: stats.open, icon: MessageSquare },
          {
            label: "Marked scheduled",
            value: stats.scheduled,
            icon: CalendarDays,
          },
          { label: "Spanish requests", value: stats.spanish, icon: Globe2 },
        ].map(({ label, value, icon: Icon }) => (
          <article className="metric" key={label}>
            <div>
              <span>{label}</span>
              <Icon size={18} />
            </div>
            <strong>{value}</strong>
            <small>Saved in your shop’s database</small>
          </article>
        ))}
      </section>
      <section className="panel">
        <div className="panel-heading">
          <div>
            <h2>
              Customer requests <span className="count">{page.total}</span>
            </h2>
            <p>
              Review details, follow up, and keep the owner-maintained status up
              to date.
            </p>
          </div>
          <button className="secondary" onClick={exportData}>
            Export JSON
          </button>
        </div>
        <div className="table-tools">
          <label className="search">
            <Search size={16} />
            <input
              aria-label="Search requests"
              placeholder="Search name or vehicle…"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setOffset(0);
              }}
            />
          </label>
          <select
            aria-label="Filter requests"
            value={filter}
            onChange={(e) => {
              setFilter(e.target.value);
              setOffset(0);
            }}
          >
            <option value="">All statuses</option>
            <option>New</option>
            <option>Contacted</option>
            <option>Scheduled</option>
          </select>
        </div>
        {loading ? (
          <p className="empty" role="status">
            Loading requests…
          </p>
        ) : (
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>Customer</th>
                  <th>Service & vehicle</th>
                  <th>Preferred visit</th>
                  <th>Status</th>
                  <th>Language</th>
                </tr>
              </thead>
              <tbody>
                {page.items.map((lead) => (
                  <tr key={lead.id}>
                    <td>
                      <button
                        className="customer-button"
                        onClick={() => {
                          setSelected(lead);
                          setDeleting(false);
                        }}
                      >
                        <strong>{lead.name}</strong>
                      </button>
                    </td>
                    <td>
                      <strong>{services[lead.service].en}</strong>
                      <small>{lead.vehicle}</small>
                    </td>
                    <td>
                      {lead.date}
                      <small>{lead.time} · Miami time</small>
                    </td>
                    <td>
                      <span className={"status " + lead.status.toLowerCase()}>
                        {lead.status}
                      </span>
                    </td>
                    <td>{lead.language === "es" ? "Español" : "English"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {page.items.length === 0 && (
              <div className="empty">
                <MessageSquare />
                <h3>
                  {query || filter
                    ? "No matching requests"
                    : "Ready for your first hello."}
                </h3>
                <p>
                  {query || filter
                    ? "Try a different search or status."
                    : "Customer intake requests will appear here. No sample data is mixed in."}
                </p>
              </div>
            )}
          </div>
        )}
        <div className="server-pagination">
          <span>{page.total} matching requests · 50 per page</span>
          <button
            className="secondary"
            disabled={offset === 0 || loading}
            onClick={() => setOffset(Math.max(0, offset - 50))}
          >
            Previous
          </button>
          <button
            className="secondary"
            disabled={page.nextOffset === null || loading}
            onClick={() => setOffset(page.nextOffset!)}
          >
            Next
          </button>
        </div>
      </section>
      <p className="fine-print">
        Requests are kept for up to {retentionDays} days. A requested date is
        not a confirmed appointment. Calendar, SMS, and live AI are not
        connected yet.
      </p>
      <dialog
        className="owner-dialog"
        ref={dialog}
        onCancel={(e) => {
          if (busy) e.preventDefault();
          else {
            setSelected(null);
            setDeleting(false);
          }
        }}
        onClose={() => {
          setSelected(null);
          setDeleting(false);
        }}
      >
        {selected && (
          <>
            <div className="eyebrow">CUSTOMER REQUEST</div>
            <h2>{selected.name}</h2>
            <p>{selected.contact}</p>
            <dl>
              <dt>Vehicle</dt>
              <dd>{selected.vehicle}</dd>
              <dt>Service</dt>
              <dd>{services[selected.service].en}</dd>
              <dt>Preferred visit</dt>
              <dd>
                {selected.date} · {selected.time}
              </dd>
              <dt>Language</dt>
              <dd>{selected.language === "es" ? "Español" : "English"}</dd>
              <dt>Notes</dt>
              <dd>{selected.notes || "No additional notes"}</dd>
            </dl>
            <label className="field">
              Request status
              <select
                disabled={busy}
                value={selected.status}
                onChange={(e) => change(e.target.value as Status)}
              >
                <option>New</option>
                <option>Contacted</option>
                <option>Scheduled</option>
              </select>
            </label>
            {error && (
              <p className="error-banner" role="alert">
                {error}
              </p>
            )}
            {deleting ? (
              <div className="delete-confirm">
                <strong>Delete this lead permanently?</strong>
                <p>
                  This removes their contact details and request from the active
                  database. This cannot be undone. Existing exports and backups
                  must be managed separately.
                </p>
                <div className="settings-actions">
                  <button
                    disabled={busy}
                    className="secondary"
                    onClick={() => setDeleting(false)}
                  >
                    Keep lead
                  </button>
                  <button disabled={busy} className="danger" onClick={remove}>
                    Delete permanently
                  </button>
                </div>
              </div>
            ) : (
              <button
                className="text-button"
                disabled={busy}
                onClick={() => setDeleting(true)}
              >
                <Trash2 size={15} />
                Delete lead
              </button>
            )}
            <button
              className="primary full"
              disabled={busy}
              onClick={() => {
                setSelected(null);
                setDeleting(false);
              }}
            >
              Done
            </button>
          </>
        )}
      </dialog>
    </>
  );
}
