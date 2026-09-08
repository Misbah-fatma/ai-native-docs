import { useState } from "react";
import { api, DEMO_ACCOUNTS, setToken } from "../api";

export default function LoginPage() {
  const [mode, setMode] = useState("signin");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("alex@ajaia.dev");
  const [password, setPassword] = useState("demo1234");
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  async function finish(result) {
    setToken(result.token);
    window.location.assign("/dashboard");
  }

  async function signIn(nextEmail, nextPassword) {
    setPending(true);
    setError("");
    try {
      const result = await api("/api/auth/login", {
        method: "POST",
        body: JSON.stringify({ email: nextEmail, password: nextPassword }),
      });
      await finish(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not sign in.");
      setPending(false);
    }
  }

  async function signUp(event) {
    event.preventDefault();
    setPending(true);
    setError("");
    try {
      const result = await api("/api/auth/signup", {
        method: "POST",
        body: JSON.stringify({ name, email, password }),
      });
      await finish(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not create that account.");
      setPending(false);
    }
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-5xl flex-col justify-center px-4 py-12 md:px-8">
      <div className="mb-10 max-w-2xl">
        <p className="text-sm font-medium uppercase tracking-[0.18em] text-accent">Ajaia</p>
        <h1 className="mt-3 font-serif text-5xl tracking-tight md:text-6xl">Ink</h1>
        <p className="mt-4 max-w-xl text-lg leading-8 text-ink-soft">
          A lightweight document editor for teams that need to write, share, and reopen work without
          standing up a full Google Docs clone.
        </p>
      </div>
      <div className="grid gap-8 lg:grid-cols-[1.1fr_0.9fr] lg:items-start">
        <div className="rounded-3xl border border-line bg-card p-6 shadow-[0_20px_60px_rgba(28,22,18,0.06)]">
          <div className="flex gap-2 rounded-full bg-paper p-1">
            <button
              type="button"
              onClick={() => {
                setMode("signin");
                setError("");
              }}
              className={`flex-1 rounded-full px-3 py-1.5 text-sm ${
                mode === "signin" ? "bg-ink text-paper" : "text-ink-soft"
              }`}
            >
              Sign in
            </button>
            <button
              type="button"
              onClick={() => {
                setMode("signup");
                setError("");
                if (email === "alex@ajaia.dev") {
                  setEmail("");
                  setPassword("");
                }
              }}
              className={`flex-1 rounded-full px-3 py-1.5 text-sm ${
                mode === "signup" ? "bg-ink text-paper" : "text-ink-soft"
              }`}
            >
              Create account
            </button>
          </div>

          {mode === "signin" ? (
            <form
              className="mt-5"
              onSubmit={(event) => {
                event.preventDefault();
                void signIn(email, password);
              }}
            >
              <h2 className="font-serif text-3xl">Welcome back</h2>
              <p className="mt-2 text-sm leading-6 text-ink-soft">
                Use a seeded reviewer account, or any account you created.
              </p>
              <AuthFields email={email} password={password} setEmail={setEmail} setPassword={setPassword} />
              {error ? <p className="mt-4 text-sm text-accent">{error}</p> : null}
              <button
                className="mt-6 w-full rounded-full bg-ink px-4 py-3 text-sm font-semibold text-paper transition hover:bg-ink-hover hover:text-paper disabled:opacity-60"
                disabled={pending}
                type="submit"
              >
                {pending ? "Signing in…" : "Continue"}
              </button>
            </form>
          ) : (
            <form className="mt-5" onSubmit={(event) => void signUp(event)}>
              <h2 className="font-serif text-3xl">Create an account</h2>
              <p className="mt-2 text-sm leading-6 text-ink-soft">
                New accounts start empty. Share a document by inviting someone’s email.
              </p>
              <label className="mt-6 block text-sm font-medium">
                Name
                <input
                  className="mt-1 w-full rounded-xl border border-line bg-paper px-3 py-2.5 outline-none focus:border-accent"
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  autoComplete="name"
                />
              </label>
              <AuthFields email={email} password={password} setEmail={setEmail} setPassword={setPassword} />
              {error ? <p className="mt-4 text-sm text-accent">{error}</p> : null}
              <button
                className="mt-6 w-full rounded-full bg-ink px-4 py-3 text-sm font-semibold text-paper transition hover:bg-ink-hover hover:text-paper disabled:opacity-60"
                disabled={pending}
                type="submit"
              >
                {pending ? "Creating…" : "Create account"}
              </button>
            </form>
          )}
        </div>
        <div className="grid gap-3">
          <p className="text-sm font-medium uppercase tracking-[0.16em] text-ink-soft">Reviewer shortcuts</p>
          {DEMO_ACCOUNTS.map((account) => (
            <button
              key={account.email}
              type="button"
              disabled={pending}
              onClick={() => {
                setMode("signin");
                setEmail(account.email);
                setPassword(account.password);
                void signIn(account.email, account.password);
              }}
              className="rounded-2xl border border-line bg-card p-4 text-left transition hover:-translate-y-0.5 hover:border-accent disabled:opacity-60"
            >
              <div className="flex items-center justify-between gap-3">
                <p className="font-medium">{account.name}</p>
                <span className="rounded-full bg-paper-deep px-2.5 py-1 text-xs font-medium text-ink-soft">
                  {account.label}
                </span>
              </div>
              <p className="mt-1 text-sm text-ink-soft">{account.email}</p>
              <p className="mt-2 text-sm leading-6 text-ink-soft">{account.detail}</p>
            </button>
          ))}
        </div>
      </div>
    </main>
  );
}

function AuthFields({ email, password, setEmail, setPassword }) {
  return (
    <>
      <label className="mt-4 block text-sm font-medium">
        Email
        <input
          className="mt-1 w-full rounded-xl border border-line bg-paper px-3 py-2.5 outline-none focus:border-accent"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          autoComplete="username"
        />
      </label>
      <label className="mt-4 block text-sm font-medium">
        Password
        <input
          type="password"
          className="mt-1 w-full rounded-xl border border-line bg-paper px-3 py-2.5 outline-none focus:border-accent"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          autoComplete="current-password"
        />
      </label>
    </>
  );
}
