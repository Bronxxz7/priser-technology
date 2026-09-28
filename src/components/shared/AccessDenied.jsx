import {
  LockKeyhole,
  ArrowLeft,
} from "lucide-react";

import {
  useNavigate,
} from "react-router-dom";

import "./AccessDenied.css";


function AccessDenied({
  modulo = "",
  accion = "ver",
}) {
  const navigate =
    useNavigate();

  const accionTexto =
    accion === "crear"
      ? "realizar esta acción"
      : accion === "editar"
      ? "editar información en esta sección"
      : accion === "eliminar"
      ? "eliminar información en esta sección"
      : accion === "abrir"
      ? "abrir caja"
      : accion === "cerrar"
      ? "cerrar caja"
      : accion === "transferir"
      ? "transferir equipos"
      : accion === "exportar"
      ? "exportar información"
      : "acceder a esta sección";

  return (
    <div className="access-denied">
      <div className="access-denied__card">
        <div className="access-denied__icon">
          <LockKeyhole size={30} />
        </div>

        <span className="access-denied__eyebrow">
          Acceso restringido
        </span>

        <h1>No tienes permiso</h1>

        <p>
          Tu cuenta no tiene autorización para{" "}
          {accionTexto}.
        </p>

        {modulo && (
          <div className="access-denied__module">
            Módulo: <strong>{modulo}</strong>
          </div>
        )}

        <p className="access-denied__help">
          Solicita permiso al administrador del sistema.
        </p>

        <button
          type="button"
          onClick={() =>
            navigate("/admin", {
              replace: true,
            })
          }
        >
          <ArrowLeft size={16} />
          Volver al inicio
        </button>
      </div>
    </div>
  );
}

export default AccessDenied;