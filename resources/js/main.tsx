import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./bootstrap";
import "../css/app.css";
import App from "./App";
import { AuthProvider } from "./context/AuthContext";
import { ApexThemeProvider } from "./context/ThemeContext";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <AuthProvider>
      <ApexThemeProvider>
        <App />
      </ApexThemeProvider>
    </AuthProvider>
  </StrictMode>,
);
