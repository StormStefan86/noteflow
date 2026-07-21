"use client";

import { FormEvent, useEffect, useState } from "react";
import { signIn, signOut } from "next-auth/react";
import { NotesWorkspace } from "../components/notes/NotesWorkspace";

type User = { id: string; name: string; email: string };
type LocalAccount = User & { passwordHash: string };

const LOCAL_ACCOUNTS = "nexa_local_accounts";
const LOCAL_SESSION = "nexa_local_session";
const LOCAL_DEMO_MODE = process.env.NEXT_PUBLIC_LOCAL_DEMO_MODE === "true";

async function hashLocalPassword(password: string) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(password));
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

function localAccounts(): LocalAccount[] {
  try {
    return JSON.parse(localStorage.getItem(LOCAL_ACCOUNTS) ?? "[]") as LocalAccount[];
  } catch {
    return [];
  }
}

export default function Home() {
  const [mode, setMode] = useState<"login" | "register">("login");
  const [showPassword, setShowPassword] = useState(false);
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    const url = new URL(window.location.href);
    if (url.searchParams.has("email") || url.searchParams.has("password")) {
      window.history.replaceState({}, "", url.pathname);
    }

    if (LOCAL_DEMO_MODE) {
      const userId = localStorage.getItem(LOCAL_SESSION);
      setUser(localAccounts().find((account) => account.id === userId) ?? null);
      return;
    }

    fetch("/api/auth/session")
      .then(async (response) => {
        if (!response.ok) throw new Error("local-preview");
        return response.json() as Promise<{ user?: User | null }>;
      })
      .then((data) => {
        if (data.user) setUser(data.user);
        else {
          const userId = localStorage.getItem(LOCAL_SESSION);
          setUser(localAccounts().find((account) => account.id === userId) ?? null);
        }
      })
      .catch(() => {
        const userId = localStorage.getItem(LOCAL_SESSION);
        setUser(localAccounts().find((account) => account.id === userId) ?? null);
      });
  }, []);

  async function authenticateLocally(payload: { name: string; email: string; password: string }) {
    const accounts = localAccounts();
    const email = payload.email.trim().toLowerCase();
    const passwordHash = await hashLocalPassword(payload.password);

    if (mode === "register") {
      if (payload.name.trim().length < 2) throw new Error("Bitte gib deinen Namen ein.");
      if (accounts.some((account) => account.email === email)) {
        throw new Error("Für diese E-Mail-Adresse besteht bereits ein Konto.");
      }
      const account: LocalAccount = {
        id: crypto.randomUUID(),
        name: payload.name.trim(),
        email,
        passwordHash,
      };
      localStorage.setItem(LOCAL_ACCOUNTS, JSON.stringify([...accounts, account]));
      localStorage.setItem(LOCAL_SESSION, account.id);
      return account;
    }

    const account = accounts.find(
      (candidate) => candidate.email === email && candidate.passwordHash === passwordHash,
    );
    if (!account) throw new Error("E-Mail-Adresse oder Passwort ist nicht korrekt.");
    localStorage.setItem(LOCAL_SESSION, account.id);
    return account;
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setNotice("");

    const values = new FormData(event.currentTarget);
    const payload = {
      name: String(values.get("name") ?? ""),
      email: String(values.get("email") ?? ""),
      password: String(values.get("password") ?? ""),
      remember: values.get("remember") === "on",
    };

    try {
      if (LOCAL_DEMO_MODE) {
        const localUser = await authenticateLocally(payload);
        setUser(localUser);
        return;
      }

      if (mode === "register") {
        const response = await fetch("/api/account/register", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        const data = (await response.json().catch(() => ({}))) as { user?: User; error?: string };
        if (response.status >= 500) {
          const localUser = await authenticateLocally(payload);
          setUser(localUser);
          return;
        }
        if (!response.ok) throw new Error(data.error ?? "Das Konto konnte nicht angelegt werden.");
      }

      const result = await signIn("credentials", { redirect: false, email: payload.email, password: payload.password });
      if (result?.error) {
        const localUser = await authenticateLocally(payload);
        setUser(localUser);
        return;
      }
      const session = await fetch("/api/auth/session").then((response) => response.json()) as { user?: User };
      if (!session.user) throw new Error("Die Anmeldung konnte nicht abgeschlossen werden.");
      setUser(session.user);
      setNotice("");
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Bitte versuche es erneut.");
    } finally {
      setBusy(false);
    }
  }

  async function logout() {
    setBusy(true);
    if (!LOCAL_DEMO_MODE) await signOut({ redirect: false }).catch(() => undefined);
    localStorage.removeItem(LOCAL_SESSION);
    setUser(null);
    setBusy(false);
  }

  function switchMode(nextMode: "login" | "register") {
    setMode(nextMode);
    setNotice("");
  }

  if (user) return <NotesWorkspace user={user} onLogout={logout} />;

  return (
    <main className="login-page">
      <div className="ambient ambient-one" aria-hidden="true" />
      <div className="ambient ambient-two" aria-hidden="true" />

      <section className="login-shell" aria-labelledby="login-title">
        <div className="welcome-panel">
          <a className="brand" href="#" aria-label="Startseite">
            <span className="brand-mark" aria-hidden="true">N</span>
            <span>nexa</span>
          </a>

          <div className="welcome-copy">
            <p className="eyebrow">{mode === "login" ? "Willkommen zur\u00fcck" : "Dein neues Konto"}</p>
            <h1>Dein n\u00e4chster Schritt beginnt hier.</h1>
            <p>
              Deine Zugangsdaten bleiben in der lokalen Entwicklungsumgebung in diesem Browser.
            </p>
          </div>

          <p className="panel-note">Lokal. Sicher. Vorbereitet.</p>
        </div>

        <div className="form-panel">
          <div className="form-wrap">
            <>
                <div className="user-symbol" aria-hidden="true"><span /></div>
                <p className="eyebrow form-eyebrow">
                  {mode === "login" ? "Sch\u00f6n, dich zu sehen" : "In wenigen Sekunden bereit"}
                </p>
                <h2 id="login-title">{mode === "login" ? "Anmelden" : "Konto erstellen"}</h2>
                <p className="form-intro">
                  {mode === "login" ? "Bitte gib deine Zugangsdaten ein." : "Die Daten werden nur lokal gespeichert."}
                </p>

                <form method="post" onSubmit={handleSubmit}>
                  {mode === "register" && (
                    <label className="field">
                      <span className="field-label">Name</span>
                      <span className="input-row">
                        <span className="person-icon" aria-hidden="true" />
                        <input type="text" name="name" autoComplete="name" placeholder="Dein Name" minLength={2} required />
                      </span>
                    </label>
                  )}

                  <label className="field">
                    <span className="field-label">E-Mail-Adresse</span>
                    <span className="input-row">
                      <span className="mail-icon" aria-hidden="true" />
                      <input type="email" name="email" autoComplete="email" placeholder="name@beispiel.de" required />
                    </span>
                  </label>

                  <label className="field">
                    <span className="field-label">Passwort</span>
                    <span className="input-row">
                      <span className="lock-icon" aria-hidden="true" />
                      <input
                        type={showPassword ? "text" : "password"}
                        name="password"
                        autoComplete={mode === "login" ? "current-password" : "new-password"}
                        placeholder="Mindestens 8 Zeichen"
                        minLength={8}
                        required
                      />
                      <button
                        className="reveal-button"
                        type="button"
                        onClick={() => setShowPassword((value) => !value)}
                        aria-label={showPassword ? "Passwort verbergen" : "Passwort anzeigen"}
                      >
                        {showPassword ? "Verbergen" : "Anzeigen"}
                      </button>
                    </span>
                  </label>

                  {mode === "login" && (
                    <div className="form-options">
                      <label className="remember">
                        <input type="checkbox" name="remember" />
                        <span>Angemeldet bleiben</span>
                      </label>
                      <button
                        className="text-button"
                        type="button"
                        onClick={() => setNotice("Der Passwort-Reset wird beim Online-Betrieb eingerichtet.")}
                      >
                        Passwort vergessen?
                      </button>
                    </div>
                  )}

                  <button className="login-button" type="submit" disabled={busy}>
                    <span>{busy ? "Bitte warten ..." : mode === "login" ? "Anmelden" : "Konto erstellen"}</span>
                    <span aria-hidden="true">{String.fromCharCode(8594)}</span>
                  </button>

                  <p className="status error-status" role="status" aria-live="polite">{notice}</p>
                </form>

                <p className="signup">
                  {mode === "login" ? "Noch kein Konto? " : "Bereits registriert? "}
                  <button
                    className="mode-button"
                    type="button"
                    onClick={() => switchMode(mode === "login" ? "register" : "login")}
                  >
                    {mode === "login" ? "Konto erstellen" : "Jetzt anmelden"}
                  </button>
                </p>
              </>
          </div>
        </div>
      </section>
    </main>
  );
}
