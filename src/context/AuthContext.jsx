import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  doc,
  onSnapshot,
} from "firebase/firestore";

import {
  db,
} from "../firebase/firebaseConfig";

import {
  cerrarSesion as cerrarSesionFirebase,
  observarSesion,
} from "../services/authService";


const AuthContext =
  createContext(null);


export function AuthProvider({
  children,
}) {
  const [
    usuario,
    setUsuario,
  ] = useState(null);

  const [
    perfil,
    setPerfil,
  ] = useState(null);

  const [
    cargando,
    setCargando,
  ] = useState(true);


  useEffect(() => {
    let cancelarPerfil = null;

    const cancelarAuth =
      observarSesion(
        (usuarioFirebase) => {
          cancelarPerfil?.();
          cancelarPerfil = null;

          if (!usuarioFirebase) {
            setUsuario(null);
            setPerfil(null);
            setCargando(false);
            return;
          }

          setCargando(true);

          const referencia =
            doc(
              db,
              "usuarios",
              usuarioFirebase.uid
            );

          cancelarPerfil =
            onSnapshot(
              referencia,

              async (
                snapshot
              ) => {
                /*
                  SEGURIDAD:
                  Auth sin documento en /usuarios NO entra.
                */
                if (
                  !snapshot.exists()
                ) {
                  setUsuario(null);
                  setPerfil(null);
                  setCargando(false);

                  await cerrarSesionFirebase();
                  return;
                }

                const datos = {
                  id:
                    snapshot.id,

                  ...snapshot.data(),
                };

                /*
                  Una cuenta desactivada pierde la sesión
                  aunque ya estuviera conectada.
                */
                if (
                  datos.activo !== true
                ) {
                  setUsuario(null);
                  setPerfil(null);
                  setCargando(false);

                  await cerrarSesionFirebase();
                  return;
                }

                setUsuario(
                  usuarioFirebase
                );

                setPerfil(
                  datos
                );

                setCargando(false);
              },

              async () => {
                setUsuario(null);
                setPerfil(null);
                setCargando(false);

                await cerrarSesionFirebase();
              }
            );
        }
      );

    return () => {
      cancelarPerfil?.();
      cancelarAuth?.();
    };
  }, []);


  async function cerrarSesion() {
    await cerrarSesionFirebase();

    setUsuario(null);
    setPerfil(null);
  }


  const valor =
    useMemo(
      () => ({
        usuario,
        perfil,
        cargando,
        cerrarSesion,
      }),
      [
        usuario,
        perfil,
        cargando,
      ]
    );


  return (
    <AuthContext.Provider
      value={valor}
    >
      {children}
    </AuthContext.Provider>
  );
}


export function useAuth() {
  const contexto =
    useContext(
      AuthContext
    );

  if (!contexto) {
    throw new Error(
      "useAuth debe usarse dentro de AuthProvider."
    );
  }

  return contexto;
}
