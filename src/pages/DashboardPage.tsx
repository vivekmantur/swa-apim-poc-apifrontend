import { useCallback, useEffect, useState } from "react";
import { callApi, type ApiResult } from "../api/client";
import { getGraphToken } from "../auth/graphToken";
import { signOut, type ClientPrincipal } from "../auth/swaAuth";

interface Props {
  principal: ClientPrincipal;
}

type Panel = { title: string; note: string; result?: ApiResult; error?: string };

interface WorkflowItem {
  id: string;
  title: string;
  bucket: string;
  status: "NotStarted" | "InProgress" | "Completed";
  dueDate: string;
  isOverdue: boolean;
}

interface DashboardData {
  summary: { total: number; notStarted: number; inProgress: number; completed: number; overdue: number };
  workflows: WorkflowItem[];
  serverTimeUtc: string;
}

const statusLabels: Record<WorkflowItem["status"], string> = {
  NotStarted: "Not started",
  InProgress: "In progress",
  Completed: "Completed",
};

export function DashboardPage({ principal }: Props) {
  const [dashboard, setDashboard] = useState<ApiResult>();
  const [panels, setPanels] = useState<Record<string, Panel>>({});

  const loadDashboard = useCallback(async () => setDashboard(await callApi("/api/dashboard")), []);

  useEffect(() => {
    void loadDashboard();
  }, [loadDashboard]);

  async function run(key: string, title: string, note: string, action: () => Promise<ApiResult>) {
    setPanels((p) => ({ ...p, [key]: { title, note } }));
    try {
      const result = await action();
      setPanels((p) => ({ ...p, [key]: { title, note, result } }));
    } catch (error) {
      setPanels((p) => ({ ...p, [key]: { title, note, error: String(error) } }));
    }
  }

  const data =
    dashboard && dashboard.status === 200 ? (dashboard.body as DashboardData) : undefined;

  const oidClaim = principal.claims?.find(
    (c) => c.typ === "http://schemas.microsoft.com/identity/claims/objectidentifier" || c.typ === "oid",
  )?.val;

  return (
    <main className="dashboard">
      <header className="topbar">
        <div>
          <p className="eyebrow">SWA → APIM → App Service</p>
          <h1>Dashboard</h1>
        </div>
        <div className="user">
          <span>{principal.userDetails}</span>
          <button onClick={signOut}>Sign out</button>
        </div>
      </header>

      <section className="card data-card">
        <div className="data-head">
          <div>
            <h2>Workflow data from the API</h2>
            <p className="muted">
              Returned by <code>GET /api/dashboard</code> through SWA → APIM → App Service.
              {data && ` Server time ${new Date(data.serverTimeUtc).toLocaleString()}.`}
            </p>
          </div>
          <button onClick={() => void loadDashboard()}>Refresh</button>
        </div>

        {!dashboard && <p className="muted">Loading…</p>}
        {dashboard && !data && (
          <p className="error-text">The API returned HTTP {dashboard.status || "redirect"}. See card 2 below.</p>
        )}

        {data && (
          <>
            <div className="stats">
              <Stat label="Total" value={data.summary.total} />
              <Stat label="Not started" value={data.summary.notStarted} />
              <Stat label="In progress" value={data.summary.inProgress} />
              <Stat label="Completed" value={data.summary.completed} />
              <Stat label="Overdue" value={data.summary.overdue} highlight={data.summary.overdue > 0} />
            </div>

            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Workflow</th>
                    <th>Bucket</th>
                    <th>Status</th>
                    <th>Due</th>
                  </tr>
                </thead>
                <tbody>
                  {data.workflows.map((item) => (
                    <tr key={item.id}>
                      <td>{item.title}</td>
                      <td>{item.bucket}</td>
                      <td>
                        <span className={`status status-${item.status}`}>{statusLabels[item.status]}</span>
                      </td>
                      <td className={item.isOverdue ? "overdue" : undefined}>
                        {new Date(`${item.dueDate}T00:00:00`).toLocaleDateString()}
                        {item.isOverdue && " · overdue"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </section>

      <section className="grid">
        <article className="card">
          <h2>1. Browser view (/.auth/me)</h2>
          <p className="muted">What SWA tells the browser. Not trusted by the backend.</p>
          <dl>
            <dt>SWA userId</dt>
            <dd>{principal.userId}</dd>
            <dt>Entra oid (claims)</dt>
            <dd>{oidClaim ?? "not present"}</dd>
            <dt>Roles</dt>
            <dd>{principal.userRoles.join(", ")}</dd>
          </dl>
        </article>

        <article className="card">
          <h2>2. Backend view (/api/dashboard)</h2>
          <p className="muted">What the .NET API received through SWA and APIM.</p>
          <ResultView result={dashboard} />
          <button onClick={() => void loadDashboard()}>Refresh</button>
        </article>
      </section>

      <section className="actions">
        <button
          onClick={() =>
            void run(
              "diag",
              "3. What reached the API",
              "Raw x-ms-client-principal, the token SWA sent to APIM (claims only), and header names.",
              () => callApi("/api/diagnostics/request"),
            )
          }
        >
          Inspect request
        </button>
        <button
          onClick={() =>
            void run(
              "verify",
              "4. Verify Entra identity",
              "Gets a Graph token (User.Read) in the browser; the API asks Graph for the oid and links it to SWA's userId.",
              async () => {
                const result = await callApi("/api/identity/verify", {
                  method: "POST",
                  graphToken: await getGraphToken(principal.userDetails),
                });
                await loadDashboard();
                return result;
              },
            )
          }
        >
          Verify Entra identity
        </button>
        <button
          onClick={() =>
            void run(
              "graph",
              "5. Backend calls Graph (OBO replacement)",
              "The API calls Graph /me with the forwarded token instead of using OBO.",
              async () =>
                callApi("/api/graph/me", { graphToken: await getGraphToken(principal.userDetails) }),
            )
          }
        >
          Call Graph via backend
        </button>
      </section>

      <section className="grid">
        {Object.entries(panels).map(([key, panel]) => (
          <article className="card" key={key}>
            <h2>{panel.title}</h2>
            <p className="muted">{panel.note}</p>
            {panel.error ? <pre className="error">{panel.error}</pre> : <ResultView result={panel.result} />}
          </article>
        ))}
      </section>
    </main>
  );
}

function Stat({ label, value, highlight = false }: { label: string; value: number; highlight?: boolean }) {
  return (
    <div className={highlight ? "stat stat-alert" : "stat"}>
      <span className="stat-value">{value}</span>
      <span className="stat-label">{label}</span>
    </div>
  );
}

function ResultView({ result }: { result?: ApiResult }) {
  if (!result) {
    return <p className="muted">Loading…</p>;
  }
  const ok = result.status >= 200 && result.status < 300;
  return (
    <>
      <span className={ok ? "badge ok" : "badge fail"}>HTTP {result.status || "redirect"}</span>
      <pre>{JSON.stringify(result.body, null, 2)}</pre>
    </>
  );
}
