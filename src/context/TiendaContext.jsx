import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  useAuth,
} from "./AuthContext";

import {
  suscribirseTiendas,
} from "../services/tiendasService";


const TiendaContext =
  createContext(null);


const TODAS = {
  id: "todas",
  nombre: "TODAS",
  esGeneral: true,
};


function idNormalizado(
  valor
) {
  return String(
    valor || ""
  )
    .trim()
    .toLowerCase();
}


export function TiendaProvider({
  children,
}) {
  const {
    perfil,
    cargando:
      cargandoAuth,
  } = useAuth();


  const [
    tiendas,
    setTiendas,
  ] = useState([]);

  const [
    tiendaActiva,
    setTiendaActivaInterna,
  ] = useState(
    TODAS
  );

  const [
    cargandoTiendas,
    setCargandoTiendas,
  ] = useState(true);

  const [
    errorTiendas,
    setErrorTiendas,
  ] = useState("");


  const esSuperAdmin =
    perfil?.superAdmin ===
      true;


  /*
    UN SOLO LISTENER PARA TIENDAS.

    Header, Usuarios, Tiendas, Equipos y demás módulos
    consumen el mismo listado real de Firestore.
  */
  useEffect(() => {
    if (
      cargandoAuth
    ) {
      return;
    }

    if (!perfil) {
      setTiendas([]);
      setCargandoTiendas(
        false
      );
      return;
    }

    setCargandoTiendas(
      true
    );

    setErrorTiendas("");

    const cancelar =
      suscribirseTiendas(
        (lista) => {
          setTiendas(
            lista
          );

          setCargandoTiendas(
            false
          );
        },

        (error) => {
          setTiendas([]);

          setErrorTiendas(
            error?.message ||
            "No se pudieron cargar las tiendas."
          );

          setCargandoTiendas(
            false
          );
        }
      );

    return cancelar;
  }, [
    cargandoAuth,
    perfil?.id,
  ]);


  const tiendasActivas =
    useMemo(
      () =>
        tiendas.filter(
          (tienda) =>
            tienda.activo !==
            false
        ),
      [
        tiendas,
      ]
    );


  const tiendasPermitidasIds =
    useMemo(() => {
      if (
        esSuperAdmin
      ) {
        return tiendasActivas.map(
          (tienda) =>
            idNormalizado(
              tienda.id
            )
        );
      }

      const resultado =
        new Set();

      if (
        Array.isArray(
          perfil?.tiendasPermitidas
        )
      ) {
        perfil.tiendasPermitidas.forEach(
          (id) => {
            const limpio =
              idNormalizado(
                id
              );

            if (
              limpio &&
              limpio !==
                "todas"
            ) {
              resultado.add(
                limpio
              );
            }
          }
        );
      }

      const tiendaPerfil =
        idNormalizado(
          perfil?.tiendaId
        );

      if (
        tiendaPerfil &&
        tiendaPerfil !==
          "todas"
      ) {
        resultado.add(
          tiendaPerfil
        );
      }

      return Array.from(
        resultado
      );
    }, [
      esSuperAdmin,
      perfil?.tiendaId,
      perfil?.tiendasPermitidas,
      tiendasActivas,
    ]);


  const tiendasSeleccionables =
    useMemo(() => {
      if (
        esSuperAdmin
      ) {
        return [
          TODAS,
          ...tiendasActivas,
        ];
      }

      return tiendasActivas.filter(
        (tienda) =>
          tiendasPermitidasIds.includes(
            idNormalizado(
              tienda.id
            )
          )
      );
    }, [
      esSuperAdmin,
      tiendasActivas,
      tiendasPermitidasIds,
    ]);


  function obtenerTienda(
    id
  ) {
    const limpio =
      idNormalizado(
        id
      );

    if (
      limpio ===
      "todas"
    ) {
      return esSuperAdmin
        ? TODAS
        : null;
    }

    return (
      tiendasActivas.find(
        (tienda) =>
          idNormalizado(
            tienda.id
          ) === limpio
      ) ||
      null
    );
  }


  function cambiarTienda(
    valor
  ) {
    const id =
      typeof valor ===
      "string"
        ? valor
        : valor?.id;

    const nueva =
      obtenerTienda(
        id
      );

    if (!nueva) {
      return false;
    }

    if (
      !esSuperAdmin &&
      !tiendasPermitidasIds.includes(
        idNormalizado(
          nueva.id
        )
      )
    ) {
      return false;
    }

    setTiendaActivaInterna(
      nueva
    );

    localStorage.setItem(
      "tiendaActivaId",
      nueva.id
    );

    return true;
  }


  useEffect(() => {
    if (
      cargandoAuth ||
      cargandoTiendas ||
      !perfil
    ) {
      return;
    }

    if (
      esSuperAdmin
    ) {
      const guardada =
        localStorage.getItem(
          "tiendaActivaId"
        );

      const encontrada =
        guardada
          ? obtenerTienda(
              guardada
            )
          : null;

      if (
        encontrada
      ) {
        setTiendaActivaInterna(
          encontrada
        );
      } else {
        setTiendaActivaInterna(
          TODAS
        );

        localStorage.setItem(
          "tiendaActivaId",
          "todas"
        );
      }

      return;
    }


    const actualPermitida =
      tiendaActiva &&
      tiendasPermitidasIds.includes(
        idNormalizado(
          tiendaActiva.id
        )
      );

    if (
      actualPermitida
    ) {
      return;
    }

    const primera =
      tiendasSeleccionables[0] ||
      null;

    setTiendaActivaInterna(
      primera
    );

    if (
      primera
    ) {
      localStorage.setItem(
        "tiendaActivaId",
        primera.id
      );
    } else {
      localStorage.removeItem(
        "tiendaActivaId"
      );
    }
  }, [
    cargandoAuth,
    cargandoTiendas,
    perfil?.id,
    esSuperAdmin,
    tiendasActivas,
    tiendasPermitidasIds,
    tiendasSeleccionables,
  ]);


  const valor =
    useMemo(
      () => ({
        /*
          tiendas incluye activas e inactivas para la pantalla
          administrativa de Tiendas.
        */
        tiendas,

        /*
          tiendasActivas se usa cuando solo deben aparecer
          tiendas operativas.
        */
        tiendasActivas,

        tiendaActiva,
        tiendasSeleccionables,
        cargandoTiendas,
        errorTiendas,
        esSuperAdmin,

        cambiarTienda,

        seleccionarTienda:
          cambiarTienda,

        setTiendaActiva:
          cambiarTienda,
      }),
      [
        tiendas,
        tiendasActivas,
        tiendaActiva,
        tiendasSeleccionables,
        cargandoTiendas,
        errorTiendas,
        esSuperAdmin,
      ]
    );


  return (
    <TiendaContext.Provider
      value={
        valor
      }
    >
      {children}
    </TiendaContext.Provider>
  );
}


export function useTienda() {
  const contexto =
    useContext(
      TiendaContext
    );

  if (!contexto) {
    throw new Error(
      "useTienda debe usarse dentro de TiendaProvider."
    );
  }

  return contexto;
}


export default TiendaContext;