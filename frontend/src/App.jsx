import { Route, Routes } from "react-router";
import AuthProvider from "./auth/AuthProvider";
import { RedirectIfAuthenticated, RequireAuth } from "./auth/routes";
import HomePage from "./pages/HomePage";
import LoginPage from "./pages/LoginPage";
import OrganizerRegisterPage from "./pages/OrganizerRegisterPage";
import RegisterPage from "./pages/RegisterPage";
import SpacePage from "./pages/SpacePage";

export default function App() {
  return (
    <AuthProvider>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/inscription" element={<RegisterPage />} />
        <Route path="/organisateur/inscription" element={<OrganizerRegisterPage />} />
        <Route element={<RedirectIfAuthenticated />}>
          <Route path="/connexion" element={<LoginPage />} />
        </Route>
        <Route element={<RequireAuth />}>
          <Route path="/accueil" element={<SpacePage title="Accueil" />} />
        </Route>
        <Route element={<RequireAuth role="ORGANISATEUR" />}>
          <Route
            path="/organisateur"
            element={<SpacePage title="Espace organisateur" />}
          />
        </Route>
      </Routes>
    </AuthProvider>
  );
}
