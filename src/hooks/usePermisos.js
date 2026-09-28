import {
  useCallback,
} from "react";

import {
  useAuth,
} from "../context/AuthContext";

import {
  tienePermisoPerfil,
} from "../routes/PermissionRoute";


export function usePermisos() {
  const {
    perfil,
    cargando,
  } = useAuth();

  const puede =
    useCallback(
      (
        modulo,
        accion = "ver"
      ) =>
        tienePermisoPerfil(
          perfil,
          modulo,
          accion
        ),
      [perfil]
    );

  return {
    perfil,
    cargando,
    puede,
    puedeVer: (modulo) =>
      puede(modulo, "ver"),
    puedeCrear: (modulo) =>
      puede(modulo, "crear"),
    puedeEditar: (modulo) =>
      puede(modulo, "editar"),
    puedeEliminar: (modulo) =>
      puede(modulo, "eliminar"),
  };
}

export default usePermisos;