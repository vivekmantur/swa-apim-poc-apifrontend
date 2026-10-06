import { useEffect, useState } from "react";
import { BrowserRouter, Navigate, Route, Routes } from "react-router";
import { getClientPrincipal, type ClientPrincipal } from "./auth/swaAuth";
import { DashboardPage } from "./pages/DashboardPage";
import { LoginPage } from "./pages/LoginPage";

export function App() {
  const [principal, setPrincipal] = useState<ClientPrincipal | null | undefined>(undefined);

  useEffect(() => {
    getClientPrincipal().then(setPrincipal, () => setPrincipal(null));
  }, []);

  if (principal === undefined) {
    return <p className="loading">Loading…</p>;
  }

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={principal ? <Navigate to="/dashboard" replace /> : <LoginPage />} />
        <Route
          path="/dashboard"
          element={principal ? <DashboardPage principal={principal} /> : <Navigate to="/login" replace />}
        />
        <Route path="*" element={<Navigate to={principal ? "/dashboard" : "/login"} replace />} />
      </Routes>
    </BrowserRouter>
  );
}
