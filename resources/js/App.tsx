import type React from "react";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { useAuth } from "./context/AuthContext";
import { LoginPage } from "./pages/LoginPage";
import { GymPage } from "./pages/GymPage";

function RequireAuth({ children }: { children: React.ReactElement }) {
  const { isAuthenticated } = useAuth();
  return isAuthenticated ? children : <Navigate to="/login" replace />;
}

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route
          path="/*"
          element={
            <RequireAuth>
              <GymPage />
            </RequireAuth>
          }
        />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
