import {
  useEffect,
  useMemo,
} from "react";

import {
  ChevronDown,
  Store,
} from "lucide-react";

import {
  useAuth,
} from "../../context/AuthContext";

import {
  useTienda,
} from "../../context/TiendaContext";

import NotificationBell from "./NotificationBell";

import "./Header.css";


function Header() {
  const {
    usuario,
    perfil,
  } = useAuth();

  const tiendaContext =
    useTienda();

  const {
    tiendaActiva,
    tiendas = [],
  } = tiendaContext;


  const rol =
    String(
      perfil?.rol || ""
    )
      .trim()
      .toLowerCase();


  const esSuperAdmin =
    perfil?.superAdmin ===
      true;


  const nombreUsuario =
    String(
      perfil?.nombre ||
      usuario?.displayName ||
      usuario?.email ||
      perfil?.email ||
      perfil?.correo ||
      "Usuario"
    ).trim();


  const inicial =
    nombreUsuario
      .charAt(0)
      .toUpperCase() ||
    "U";


  function nombreRol() {
    if (
      perfil?.superAdmin ===
      true
    ) {
      return "Administrador";
    }

    switch (rol) {
      case "administrador":
      case "admin":
        return "Administrador";

      case "encargado":
        return "Encargado";

      case "vendedor":
        return "Vendedor";

      default:
        return rol
          ? rol
              .charAt(0)
              .toUpperCase() +
              rol.slice(1)
          : "Usuario";
    }
  }


  const tiendasReales =
    useMemo(
      () =>
        tiendas
          .filter(
            (tienda) =>
              tienda?.id &&
              tienda.id !==
                "todas" &&
              tienda.activo !==
                false
          )
          .sort(
            (a, b) =>
              String(
                a.nombre ||
                a.id
              ).localeCompare(
                String(
                  b.nombre ||
                  b.id
                ),
                "es"
              )
          ),
      [
        tiendas,
      ]
    );


  const tiendasPermitidas =
    useMemo(() => {
      if (
        esSuperAdmin
      ) {
        return [
          {
            id: "todas",
            nombre: "TODAS",
            esGeneral: true,
          },
          ...tiendasReales,
        ];
      }

      const ids =
        Array.isArray(
          perfil?.tiendasPermitidas
        )
          ? perfil.tiendasPermitidas.filter(
              (id) =>
                id &&
                id !==
                  "todas"
            )
          : [];

      if (
        perfil?.tiendaId &&
        perfil.tiendaId !==
          "todas" &&
        !ids.includes(
          perfil.tiendaId
        )
      ) {
        ids.unshift(
          perfil.tiendaId
        );
      }

      return tiendasReales.filter(
        (tienda) =>
          ids.includes(
            tienda.id
          )
      );
    }, [
      esSuperAdmin,
      perfil?.tiendaId,
      perfil?.tiendasPermitidas,
      tiendasReales,
    ]);


  function cambiarTiendaPorId(
    tiendaId
  ) {
    const nuevaTienda =
      tiendaId ===
      "todas"
        ? {
            id: "todas",
            nombre: "TODAS",
            esGeneral: true,
          }
        : tiendas.find(
            (tienda) =>
              tienda.id ===
              tiendaId
          );

    if (!nuevaTienda) {
      return;
    }

    if (
      typeof tiendaContext.cambiarTienda ===
      "function"
    ) {
      try {
        tiendaContext.cambiarTienda(
          nuevaTienda
        );
      } catch {
        tiendaContext.cambiarTienda(
          tiendaId
        );
      }

      return;
    }

    if (
      typeof tiendaContext.seleccionarTienda ===
      "function"
    ) {
      try {
        tiendaContext.seleccionarTienda(
          nuevaTienda
        );
      } catch {
        tiendaContext.seleccionarTienda(
          tiendaId
        );
      }

      return;
    }

    if (
      typeof tiendaContext.setTiendaActiva ===
      "function"
    ) {
      tiendaContext.setTiendaActiva(
        nuevaTienda
      );
    }
  }


  useEffect(() => {
    if (
      esSuperAdmin ||
      tiendasPermitidas.length ===
        0
    ) {
      return;
    }

    const activaPermitida =
      tiendasPermitidas.some(
        (tienda) =>
          tienda.id ===
          tiendaActiva?.id
      );

    if (
      !activaPermitida
    ) {
      cambiarTiendaPorId(
        tiendasPermitidas[0].id
      );
    }
  }, [
    esSuperAdmin,
    tiendaActiva?.id,
    tiendasPermitidas,
  ]);


  const nombreTiendaCuenta =
    useMemo(() => {
      if (
        esSuperAdmin
      ) {
        return "Acceso general";
      }

      const id =
        perfil?.tiendaId &&
        perfil.tiendaId !==
          "todas"
          ? perfil.tiendaId
          : tiendasPermitidas[0]
              ?.id;

      if (!id) {
        return "Sin tienda asignada";
      }

      return (
        tiendas.find(
          (tienda) =>
            tienda.id === id
        )?.nombre ||
        String(
          id
        ).toUpperCase()
      );
    }, [
      esSuperAdmin,
      perfil?.tiendaId,
      tiendas,
      tiendasPermitidas,
    ]);


  const descripcionCuenta =
    esSuperAdmin
      ? "Administrador general"
      : `${nombreRol()} · ${nombreTiendaCuenta}`;


  const fechaActual =
    new Intl.DateTimeFormat(
      "es-PE",
      {
        weekday: "long",
        day: "2-digit",
        month: "long",
        year: "numeric",
      }
    ).format(
      new Date()
    );


  const puedeCambiarTienda =
    esSuperAdmin ||
    tiendasPermitidas.length >
      1;


  return (
    <header className="header">

      <div className="header__left">
        <h2>
          Panel administrativo
        </h2>

        <p>
          {fechaActual
            .charAt(0)
            .toUpperCase() +
            fechaActual.slice(1)}
        </p>
      </div>


      <div className="header__right">

        {puedeCambiarTienda ? (
          <div className="header__store-select">

            <Store
              size={18}
            />

            <select
              value={
                tiendaActiva?.id ||
                tiendasPermitidas[0]
                  ?.id ||
                ""
              }
              onChange={(
                event
              ) =>
                cambiarTiendaPorId(
                  event.target.value
                )
              }
              aria-label="Tienda activa"
            >
              {tiendasPermitidas.map(
                (tienda) => (
                  <option
                    key={
                      tienda.id
                    }
                    value={
                      tienda.id
                    }
                  >
                    {tienda.nombre ||
                      String(
                        tienda.id
                      ).toUpperCase()}
                  </option>
                )
              )}
            </select>

            <ChevronDown
              size={15}
              className="header__store-chevron"
            />

          </div>
        ) : (
          <div className="header__store-fixed">
            <Store
              size={18}
            />

            <span>
              {tiendaActiva?.nombre ||
                tiendasPermitidas[0]
                  ?.nombre ||
                nombreTiendaCuenta}
            </span>
          </div>
        )}


        <NotificationBell />


        <div className="header__account">

          <div className="header__avatar">
            {inicial}
          </div>

          <div className="header__account-text">
            <strong>
              {nombreUsuario}
            </strong>

            <span>
              {descripcionCuenta}
            </span>
          </div>

        </div>

      </div>

    </header>
  );
}


export default Header;