import {
  useAuth,
} from "../context/AuthContext";

import AccessDenied from "../components/shared/AccessDenied";


export function tienePermisoPerfil(
  perfil,
  modulo,
  accion = "ver"
) {
  if (!perfil) return false;
  if (perfil.activo !== true) return false;

  if (perfil.superAdmin === true) {
    return true;
  }

  /*
    Equipos es inventario compartido de consulta.
    Cualquier cuenta ACTIVA puede entrar al módulo y buscar
    equipos de todas las tiendas.

    Crear, editar, transferir y eliminar continúan dependiendo
    de los permisos específicos del usuario.
  */
  if (
    modulo === "equipos" &&
    accion === "ver"
  ) {
    return true;
  }

  return (
    perfil.permisos?.[modulo]?.[accion] === true
  );
}


function PermissionRoute({
  modulo,
  accion = "ver",
  children,
}) {
  const {
    perfil,
    cargando,
  } = useAuth();

  if (cargando) {
    return (
      <div
        style={{
          minHeight: "55vh",
          display: "grid",
          placeItems: "center",
          color: "#667085",
          fontFamily: "system-ui, sans-serif",
        }}
      >
        Verificando permisos...
      </div>
    );
  }

  if (
    !tienePermisoPerfil(
      perfil,
      modulo,
      accion
    )
  ) {
    return (
      <AccessDenied
        modulo={modulo}
        accion={accion}
      />
    );
  }

  return children;
}

export default PermissionRoute;
