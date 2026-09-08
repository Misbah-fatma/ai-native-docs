import { Navigate, Route, Routes } from "react-router-dom";
import { useEffect, useState } from "react";
import { api, getToken } from "./api";
import LoginPage from "./pages/LoginPage.jsx";
import DashboardPage from "./pages/DashboardPage.jsx";
import EditorPage from "./pages/EditorPage.jsx";

export default function App() {
  const [user, setUser] = useState(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!getToken()) {
      setReady(true);
      return;
    }
    api("/api/auth/me")
      .then((data) => setUser(data.user))
      .catch(() => setUser(null))
      .finally(() => setReady(true));
  }, []);

  if (!ready) {
    return <p className="p-8 text-sm text-ink-soft">Loading…</p>;
  }

  return (
    <Routes>
      <Route path="/" element={user ? <Navigate to="/dashboard" replace /> : <LoginPage />} />
      <Route
        path="/dashboard"
        element={user ? <DashboardPage user={user} /> : <Navigate to="/" replace />}
      />
      <Route
        path="/docs/:id"
        element={user ? <EditorPage user={user} /> : <Navigate to="/" replace />}
      />
      <Route path="*" element={<Navigate to={user ? "/dashboard" : "/"} replace />} />
    </Routes>
  );
}
