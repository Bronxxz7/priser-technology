import {
  BrowserRouter,
  Navigate,
  Route,
  Routes,
} from "react-router-dom";

import {
  AuthProvider,
} from "../context/AuthContext";

import {
  TiendaProvider,
} from "../context/TiendaContext";

import AdminRoutes from "./AdminRoutes";
import ProtectedRoute from "./ProtectedRoute";

import LoginAdmin from "../web/auth/LoginAdmin";


function AppRouter() {
  return (
    <BrowserRouter>

      {/*
        ORDEN CORRECTO DE PROVIDERS:

        AuthProvider
          └── TiendaProvider
                └── Routes

        TiendaContext usa useAuth(), por eso AuthProvider
        SIEMPRE debe envolver a TiendaProvider.
      */}
      <AuthProvider>

        <TiendaProvider>

          <Routes>

            <Route
              path="/"
              element={
                <Navigate
                  to="/admin"
                  replace
                />
              }
            />

            <Route
              path="/login"
              element={
                <LoginAdmin />
              }
            />

            <Route
              path="/admin/*"
              element={
                <ProtectedRoute>
                  <AdminRoutes />
                </ProtectedRoute>
              }
            />

            <Route
              path="*"
              element={
                <Navigate
                  to="/admin"
                  replace
                />
              }
            />

          </Routes>

        </TiendaProvider>

      </AuthProvider>

    </BrowserRouter>
  );
}


export default AppRouter;