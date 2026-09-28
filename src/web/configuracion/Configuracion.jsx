import {
  useMemo,
  useState,
} from "react";

import {
  KeyRound,
  LogOut,
  Mail,
  ShieldCheck,
  Store,
  UserRound,
} from "lucide-react";

import {
  useAuth,
} from "../../context/AuthContext";

import {
  useTienda,
} from "../../context/TiendaContext";

import {
  recuperarPassword,
} from "../../services/authService";

import "./Configuracion.css";


function Configuracion() {
  const {
    usuario,
    perfil,
    cerrarSesion,
  } = useAuth();

  const {
    tiendas,
  } = useTienda();

  const [
    enviando,
    setEnviando,
  ] = useState(false);

  const [
    mensaje,
    setMensaje,
  ] = useState("");

  const [
    error,
    setError,
  ] = useState("");


  const nombre =
    perfil?.nombre ||
    usuario?.displayName ||
    "Usuario";


  const correo =
    perfil?.correo ||
    usuario?.email ||
    "";


  const rolTexto =
    useMemo(() => {
      if (
        perfil?.superAdmin ===
        true
      ) {
        return "Superadministrador";
      }

      const rol =
        String(
          perfil?.rol || ""
        ).toLowerCase();

      const nombres = {
        administrador:
          "Administrador",

        encargado:
          "Encargado",

        vendedor:
          "Vendedor",

        personalizado:
          "Personalizado",
      };

      return (
        nombres[rol] ||
        rol ||
        "Sin rol"
      );
    }, [
      perfil,
    ]);


  const tiendasAutorizadas =
    useMemo(() => {
      const permitidas =
        Array.isArray(
          perfil?.tiendasPermitidas
        )
          ? perfil.tiendasPermitidas
          : [];

      if (
        perfil?.superAdmin ===
          true ||
        permitidas.includes(
          "todas"
        )
      ) {
        return [
          "TODAS LAS TIENDAS",
        ];
      }

      return permitidas.map(
        (id) => {
          const tienda =
            tiendas.find(
              (item) =>
                item.id === id
            );

          return (
            tienda?.nombre ||
            String(id).toUpperCase()
          );
        }
      );
    }, [
      perfil,
      tiendas,
    ]);


  async function cambiarPassword() {
    setMensaje("");
    setError("");

    if (!correo) {
      setError(
        "La cuenta no tiene un correo registrado."
      );

      return;
    }

    try {
      setEnviando(
        true
      );

      await recuperarPassword(
        correo
      );

      setMensaje(
        "Se envió un enlace de restablecimiento de contraseña a tu correo."
      );
    } catch (
      errorPassword
    ) {
      setError(
        errorPassword?.message ||
          "No se pudo enviar el correo de recuperación."
      );
    } finally {
      setEnviando(
        false
      );
    }
  }


  async function salir() {
    try {
      await cerrarSesion();
    } catch {
      setError(
        "No se pudo cerrar la sesión."
      );
    }
  }


  return (
    <div className="configuracion-page">

      <header className="configuracion-header">
        <div>
          <h1>
            Configuración
          </h1>

          <p>
            Información de tu cuenta y seguridad de acceso.
          </p>
        </div>
      </header>


      <div className="configuracion-grid">

        <section className="configuracion-card">

          <div className="configuracion-card__title">
            <div className="configuracion-icon">
              <UserRound
                size={20}
              />
            </div>

            <div>
              <h2>
                Mi cuenta
              </h2>

              <p>
                Perfil actualmente autenticado.
              </p>
            </div>
          </div>


          <div className="configuracion-data">

            <div>
              <span>
                Nombre
              </span>

              <strong>
                {nombre}
              </strong>
            </div>


            <div>
              <span>
                Correo
              </span>

              <strong>
                {correo ||
                  "Sin correo"}
              </strong>
            </div>


            <div>
              <span>
                Rol
              </span>

              <strong>
                {rolTexto}
              </strong>
            </div>


            <div>
              <span>
                Estado
              </span>

              <strong
                className={
                  perfil?.activo ===
                  true
                    ? "configuracion-ok"
                    : "configuracion-danger"
                }
              >
                {perfil?.activo ===
                true
                  ? "Activo"
                  : "Inactivo"}
              </strong>
            </div>

          </div>

        </section>


        <section className="configuracion-card">

          <div className="configuracion-card__title">
            <div className="configuracion-icon">
              <Store
                size={20}
              />
            </div>

            <div>
              <h2>
                Acceso a tiendas
              </h2>

              <p>
                Tiendas habilitadas para esta cuenta.
              </p>
            </div>
          </div>


          <div className="configuracion-stores">

            {tiendasAutorizadas.length >
            0 ? (

              tiendasAutorizadas.map(
                (tienda) => (
                  <span
                    key={
                      tienda
                    }
                    className="configuracion-store-chip"
                  >
                    {tienda}
                  </span>
                )
              )

            ) : (

              <p className="configuracion-empty">
                No hay tiendas asignadas.
              </p>

            )}

          </div>

        </section>


        <section className="configuracion-card configuracion-card--wide">

          <div className="configuracion-card__title">
            <div className="configuracion-icon">
              <ShieldCheck
                size={20}
              />
            </div>

            <div>
              <h2>
                Seguridad
              </h2>

              <p>
                Controles de seguridad de la sesión actual.
              </p>
            </div>
          </div>


          <div className="configuracion-security">

            <div className="configuracion-security-row">
              <div>
                <strong>
                  Autenticación
                </strong>

                <span>
                  Inicio de sesión mediante Firebase Authentication.
                </span>
              </div>

              <span className="configuracion-status configuracion-status--ok">
                Activa
              </span>
            </div>


            <div className="configuracion-security-row">
              <div>
                <strong>
                  Perfil autorizado
                </strong>

                <span>
                  La cuenta necesita un perfil activo en Firestore para ingresar.
                </span>
              </div>

              <span
                className={
                  perfil
                    ? "configuracion-status configuracion-status--ok"
                    : "configuracion-status configuracion-status--danger"
                }
              >
                {perfil
                  ? "Autorizado"
                  : "No autorizado"}
              </span>
            </div>


            <div className="configuracion-security-row">
              <div>
                <strong>
                  Nivel de acceso
                </strong>

                <span>
                  {rolTexto}
                </span>
              </div>

              <span className="configuracion-status">
                {perfil?.superAdmin
                  ? "Acceso total"
                  : "Según permisos"}
              </span>
            </div>

          </div>

        </section>


        <section className="configuracion-card configuracion-card--wide">

          <div className="configuracion-card__title">
            <div className="configuracion-icon">
              <KeyRound
                size={20}
              />
            </div>

            <div>
              <h2>
                Contraseña y sesión
              </h2>

              <p>
                Acciones relacionadas con el acceso a tu cuenta.
              </p>
            </div>
          </div>


          {mensaje && (
            <div className="configuracion-message configuracion-message--ok">
              {mensaje}
            </div>
          )}


          {error && (
            <div className="configuracion-message configuracion-message--error">
              {error}
            </div>
          )}


          <div className="configuracion-actions">

            <button
              type="button"
              className="configuracion-button configuracion-button--secondary"
              onClick={
                cambiarPassword
              }
              disabled={
                enviando
              }
            >
              <Mail
                size={17}
              />

              {enviando
                ? "Enviando..."
                : "Cambiar contraseña"}
            </button>


            <button
              type="button"
              className="configuracion-button configuracion-button--danger"
              onClick={
                salir
              }
            >
              <LogOut
                size={17}
              />

              Cerrar sesión
            </button>

          </div>

        </section>

      </div>

    </div>
  );
}


export default Configuracion;
