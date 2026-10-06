import { signIn } from "../auth/swaAuth";

export function LoginPage() {
  return (
    <main className="login">
      <section className="card login-card">
        <p className="eyebrow">SWA + APIM proof of concept</p>
        <h1>Sign in</h1>
        <p className="muted">
          Sign-in uses Static Web Apps authentication with your organization's Microsoft Entra ID.
          No access_as_user scope is involved.
        </p>
        <button className="primary" onClick={signIn}>
          Sign in with Microsoft
        </button>
      </section>
    </main>
  );
}
