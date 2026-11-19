import { Route, Routes } from "react-router";
import HomePage from "./pages/HomePage";
import LoginPage from "./pages/LoginPage";
import OrganizerRegisterPage from "./pages/OrganizerRegisterPage";
import RegisterPage from "./pages/RegisterPage";

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/inscription" element={<RegisterPage />} />
      <Route path="/organisateur/inscription" element={<OrganizerRegisterPage />} />
      <Route path="/connexion" element={<LoginPage />} />
    </Routes>
  );
}
