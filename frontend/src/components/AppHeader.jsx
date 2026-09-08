import { Link } from "react-router-dom";
import { clearToken } from "../api";

export default function AppHeader({ user, backHref, backLabel = "All documents" }) {
  function signOut() {
    clearToken();
    window.location.assign("/");
  }

  return (
    <header className="flex items-center justify-between gap-4 border-b border-line/80 px-4 py-3 md:px-8">
      <div className="flex min-w-0 items-center gap-4">
        {backHref ? (
          <Link className="text-sm text-ink-soft hover:text-ink" to={backHref}>
            ← {backLabel}
          </Link>
        ) : (
          <Link to="/dashboard" className="font-serif text-2xl tracking-tight">
            Ink
          </Link>
        )}
      </div>
      <div className="flex items-center gap-3">
        <div className="hidden text-right sm:block">
          <p className="text-sm font-medium">{user.name}</p>
          <p className="text-xs text-ink-soft">{user.email}</p>
        </div>
        <button
          type="button"
          onClick={signOut}
          className="rounded-full border border-line px-3 py-1.5 text-sm hover:bg-paper-deep"
        >
          Switch user
        </button>
      </div>
    </header>
  );
}
