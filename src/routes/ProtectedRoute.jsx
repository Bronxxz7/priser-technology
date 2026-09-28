import {
  Navigate,
  useLocation,
} from "react-router-dom";

import {
  useAuth,
} from "../context/AuthContext";


function ProtectedRoute({
  children,
}) {
  const {
    usuario,
    perfil,
    cargando,
  } = useAuth();

  const location =
    useLocation();


  if (cargando) {
    return (
      <div
        style={{
          minHeight: "100vh",
          display: "grid",
          placeItems: "center",
          fontFamily: "system-ui, sans-serif",
          color: "#475467",
        }}
      >
        Verificando sesión...
      </div>
    );
  }


  if (
    !usuario ||
    !perfil ||
    perfil.activo !== true
  ) {
    return (
      <Navigate
        to="/login"
        replace
        state={{
          from:
            location.pathname,
        }}
      />
    );
  }


  return children;
}


export default ProtectedRoute;
 