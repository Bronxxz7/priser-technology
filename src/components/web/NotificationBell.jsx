import {
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  AlertTriangle,
  Bell,
  Check,
  CheckCircle2,
  Clock3,
  Info,
  Send,
  Store,
  Tag,
  X,
} from "lucide-react";

import {
  useAuth,
} from "../../context/AuthContext";

import {
  useTienda,
} from "../../context/TiendaContext";

import {
  confirmarRecepcion,
  crearNotificacion,
  desactivarNotificacion,
  suscribirseConfirmaciones,
  suscribirseNotificaciones,
} from "../../services/notificacionesService";

import "./NotificationBell.css";


const FORMULARIO_VACIO = {
  titulo: "",
  mensaje: "",
  tipo: "informacion",
  tiendaDestinoId: "todas",
};


function NotificationBell() {
  const {
    usuario,
    perfil,
  } = useAuth();

  const {
    tiendaActiva,
    tiendas,
  } = useTienda();

  const [
    abierto,
    setAbierto,
  ] = useState(false);

  const [
    mostrarFormulario,
    setMostrarFormulario,
  ] = useState(false);

  const [
    notificaciones,
    setNotificaciones,
  ] = useState([]);

  const [
    confirmaciones,
    setConfirmaciones,
  ] = useState([]);

  const [
    formulario,
    setFormulario,
  ] = useState(
    FORMULARIO_VACIO
  );

  const [
    guardando,
    setGuardando,
  ] = useState(false);

  const [
    confirmandoId,
    setConfirmandoId,
  ] = useState("");

  const [
    error,
    setError,
  ] = useState("");


  const rol =
    String(
      perfil?.rol || ""
    )
      .trim()
      .toLowerCase();

  const esSuperAdmin =
    perfil?.superAdmin ===
    true;

  const esAdministrador =
    esSuperAdmin ||
    rol ===
      "administrador" ||
    rol ===
      "admin";


  const tiendasReales =
    useMemo(
      () =>
        (tiendas || [])
          .filter(
            (tienda) =>
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


  function tiendaUsuarioId() {
    if (
      !esSuperAdmin &&
      tiendaActiva?.id &&
      tiendaActiva.id !==
        "todas"
    ) {
      return tiendaActiva.id;
    }

    if (
      perfil?.tiendaId &&
      perfil.tiendaId !==
        "todas"
    ) {
      return perfil.tiendaId;
    }

    const permitidas =
      Array.isArray(
        perfil?.tiendasPermitidas
      )
        ? perfil.tiendasPermitidas
        : [];

    return (
      permitidas.find(
        (id) =>
          id &&
          id !== "todas"
      ) ||
      ""
    );
  }


  const tiendaUsuario =
    tiendaUsuarioId();


  useEffect(() => {
    const cancelar =
      suscribirseNotificaciones(
        setNotificaciones
      );

    return cancelar;
  }, []);


  useEffect(() => {
    const cancelar =
      suscribirseConfirmaciones({
        callback:
          setConfirmaciones,

        /*
          Solo el superAdmin consulta confirmaciones de TODAS
          las tiendas. Un administrador limitado a MOVISTAR,
          ENTEL, etc. consulta únicamente su propia tienda.
        */
        esAdministrador:
          esSuperAdmin,

        tiendaId:
          tiendaUsuario,
      });

    return cancelar;
  }, [
    esAdministrador,
    tiendaUsuario,
  ]);


  const confirmacionPorClave =
    useMemo(() => {
      const mapa =
        new Map();

      confirmaciones.forEach(
        (confirmacion) => {
          mapa.set(
            `${confirmacion.notificacionId}_${confirmacion.tiendaId}`,
            confirmacion
          );
        }
      );

      return mapa;
    }, [
      confirmaciones,
    ]);


  function nombreTienda(
    tiendaId
  ) {
    if (
      tiendaId ===
      "todas"
    ) {
      return "Todas las tiendas";
    }

    return (
      tiendasReales.find(
        (tienda) =>
          tienda.id ===
          tiendaId
      )?.nombre ||
      String(
        tiendaId || "-"
      ).toUpperCase()
    );
  }


  function destinosEsperados(
    notificacion
  ) {
    if (
      notificacion.tiendaDestinoId ===
      "todas"
    ) {
      return tiendasReales.map(
        (tienda) =>
          tienda.id
      );
    }

    return notificacion.tiendaDestinoId
      ? [
          notificacion.tiendaDestinoId,
        ]
      : [];
  }


  function confirmacionDe(
    notificacionId,
    tiendaId
  ) {
    return confirmacionPorClave.get(
      `${notificacionId}_${tiendaId}`
    );
  }


  function estaConfirmadaPorMiTienda(
    notificacion
  ) {
    if (!tiendaUsuario) {
      return false;
    }

    return Boolean(
      confirmacionDe(
        notificacion.id,
        tiendaUsuario
      )
    );
  }


  function correspondeAMiTienda(
    notificacion
  ) {
    if (
      esSuperAdmin
    ) {
      return true;
    }

    return (
      notificacion.tiendaDestinoId ===
        "todas" ||
      notificacion.tiendaDestinoId ===
        tiendaUsuario
    );
  }


  const visibles =
    useMemo(
      () =>
        notificaciones
          .filter(
            (notificacion) =>
              notificacion.activo !==
                false &&
              correspondeAMiTienda(
                notificacion
              )
          )
          .slice(
            0,
            30
          ),
      [
        notificaciones,
        esAdministrador,
        esSuperAdmin,
        tiendaUsuario,
      ]
    );


  const pendientes =
    useMemo(
      () => {
        if (
          esSuperAdmin
        ) {
          return visibles.filter(
            (notificacion) => {
              const destinos =
                destinosEsperados(
                  notificacion
                );

              if (
                destinos.length ===
                0
              ) {
                return false;
              }

              return destinos.some(
                (tiendaId) =>
                  !confirmacionDe(
                    notificacion.id,
                    tiendaId
                  )
              );
            }
          ).length;
        }

        return visibles.filter(
          (notificacion) =>
            !estaConfirmadaPorMiTienda(
              notificacion
            )
        ).length;
      },
      [
        visibles,
        confirmacionPorClave,
        esAdministrador,
        esSuperAdmin,
        tiendaUsuario,
        tiendasReales,
      ]
    );


  function fechaTexto(
    fecha
  ) {
    if (!fecha) {
      return "Enviando...";
    }

    const valor =
      typeof fecha.toDate ===
      "function"
        ? fecha.toDate()
        : new Date(fecha);

    if (
      Number.isNaN(
        valor.getTime()
      )
    ) {
      return "-";
    }

    return valor.toLocaleString(
      "es-PE",
      {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      }
    );
  }


  function tipoInfo(
    tipo
  ) {
    switch (tipo) {
      case "precio":
        return {
          texto:
            "Cambio de precio",
          clase:
            "precio",
          Icono:
            Tag,
        };

      case "urgente":
        return {
          texto:
            "Urgente",
          clase:
            "urgente",
          Icono:
            AlertTriangle,
        };

      default:
        return {
          texto:
            "Información",
          clase:
            "informacion",
          Icono:
            Info,
        };
    }
  }


  function cambiarCampo(
    event
  ) {
    const {
      name,
      value,
    } = event.target;

    setFormulario(
      (anterior) => ({
        ...anterior,
        [name]:
          value,
      })
    );
  }


  async function enviar(
    event
  ) {
    event.preventDefault();

    setError("");

    try {
      setGuardando(true);

      await crearNotificacion({
        ...formulario,

        creadoPorNombre:
          perfil?.nombre ||
          perfil?.email ||
          usuario?.email ||
          "Administrador",
      });

      setFormulario(
        FORMULARIO_VACIO
      );

      setMostrarFormulario(
        false
      );
    } catch (
      errorEnvio
    ) {
      setError(
        errorEnvio.message ||
          "No se pudo enviar la notificación."
      );
    } finally {
      setGuardando(false);
    }
  }


  async function confirmar(
    notificacion
  ) {
    if (
      !tiendaUsuario
    ) {
      window.alert(
        "No se pudo identificar tu tienda."
      );

      return;
    }

    try {
      setConfirmandoId(
        notificacion.id
      );

      await confirmarRecepcion({
        notificacionId:
          notificacion.id,

        tiendaId:
          tiendaUsuario,

        usuarioNombre:
          perfil?.nombre ||
          perfil?.email ||
          usuario?.email ||
          "",
      });
    } catch (
      errorConfirmacion
    ) {
      window.alert(
        errorConfirmacion.message ||
          "No se pudo confirmar la recepción."
      );
    } finally {
      setConfirmandoId(
        ""
      );
    }
  }


  async function desactivar(
    notificacion
  ) {
    const confirmarAccion =
      window.confirm(
        `¿Cerrar la notificación "${notificacion.titulo}"? Dejará de mostrarse a las tiendas.`
      );

    if (
      !confirmarAccion
    ) {
      return;
    }

    try {
      await desactivarNotificacion(
        notificacion.id
      );
    } catch (
      errorDesactivar
    ) {
      window.alert(
        errorDesactivar.message ||
          "No se pudo cerrar la notificación."
      );
    }
  }


  return (
    <div className="notification">

      <button
        type="button"
        className={
          abierto
            ? "notification__trigger notification__trigger--active"
            : "notification__trigger"
        }
        onClick={() =>
          setAbierto(
            (valor) =>
              !valor
          )
        }
        aria-label="Notificaciones"
      >
        <Bell size={20} />

        {pendientes > 0 && (
          <span className="notification__badge">
            {pendientes > 99
              ? "99+"
              : pendientes}
          </span>
        )}
      </button>


      {abierto && (
        <div className="notification__panel">

          <div className="notification__panel-header">

            <div>
              <h3>
                Notificaciones
              </h3>

              <p>
                {esAdministrador
                  ? "Mensajes enviados y confirmación por tienda."
                  : "Mensajes administrativos pendientes de confirmar."}
              </p>
            </div>

            <button
              type="button"
              className="notification__close"
              onClick={() =>
                setAbierto(
                  false
                )
              }
              aria-label="Cerrar"
            >
              <X size={18} />
            </button>

          </div>


          {esAdministrador && (
            <div className="notification__admin">

              <button
                type="button"
                className="notification__new-button"
                onClick={() => {
                  setMostrarFormulario(
                    (valor) =>
                      !valor
                  );

                  setError("");
                }}
              >
                <Send size={15} />

                {mostrarFormulario
                  ? "Cancelar nuevo mensaje"
                  : "Nueva notificación"}
              </button>


              {mostrarFormulario && (
                <form
                  className="notification__form"
                  onSubmit={
                    enviar
                  }
                >

                  <label>
                    Título

                    <input
                      name="titulo"
                      maxLength="80"
                      value={
                        formulario.titulo
                      }
                      onChange={
                        cambiarCampo
                      }
                      placeholder="Ej. Actualización de precios"
                    />
                  </label>


                  <label>
                    Tipo

                    <select
                      name="tipo"
                      value={
                        formulario.tipo
                      }
                      onChange={
                        cambiarCampo
                      }
                    >
                      <option value="informacion">
                        Información
                      </option>

                      <option value="precio">
                        Cambio de precio
                      </option>

                      <option value="urgente">
                        Urgente
                      </option>
                    </select>
                  </label>


                  <label>
                    Destino

                    <select
                      name="tiendaDestinoId"
                      value={
                        formulario.tiendaDestinoId
                      }
                      onChange={
                        cambiarCampo
                      }
                    >
                      <option value="todas">
                        Todas las tiendas
                      </option>

                      {tiendasReales.map(
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
                              tienda.id.toUpperCase()}
                          </option>
                        )
                      )}
                    </select>
                  </label>


                  <label className="notification__form-message">
                    Mensaje

                    <textarea
                      name="mensaje"
                      rows="4"
                      maxLength="500"
                      value={
                        formulario.mensaje
                      }
                      onChange={
                        cambiarCampo
                      }
                      placeholder="Escribe el mensaje que debe recibir la tienda."
                    />
                  </label>


                  {error && (
                    <div className="notification__error">
                      {error}
                    </div>
                  )}


                  <button
                    type="submit"
                    className="notification__send-button"
                    disabled={
                      guardando
                    }
                  >
                    <Send size={15} />

                    {guardando
                      ? "Enviando..."
                      : "Enviar notificación"}
                  </button>

                </form>
              )}

            </div>
          )}


          <div className="notification__list">

            {visibles.length ===
            0 ? (
              <div className="notification__empty">
                No hay notificaciones activas.
              </div>
            ) : (
              visibles.map(
                (notificacion) => {
                  const tipo =
                    tipoInfo(
                      notificacion.tipo
                    );

                  const TipoIcono =
                    tipo.Icono;

                  const destinos =
                    destinosEsperados(
                      notificacion
                    );

                  const confirmadas =
                    destinos.filter(
                      (tiendaId) =>
                        confirmacionDe(
                          notificacion.id,
                          tiendaId
                        )
                    );

                  const miConfirmacion =
                    tiendaUsuario
                      ? confirmacionDe(
                          notificacion.id,
                          tiendaUsuario
                        )
                      : null;

                  return (
                    <article
                      className="notification-card"
                      key={
                        notificacion.id
                      }
                    >

                      <div className="notification-card__top">

                        <span
                          className={`notification-card__type notification-card__type--${tipo.clase}`}
                        >
                          <TipoIcono
                            size={13}
                          />

                          {tipo.texto}
                        </span>

                        <span className="notification-card__date">
                          {fechaTexto(
                            notificacion.fechaCreacion
                          )}
                        </span>

                      </div>


                      <h4>
                        {notificacion.titulo}
                      </h4>

                      <p className="notification-card__message">
                        {notificacion.mensaje}
                      </p>


                      <div className="notification-card__destination">
                        <Store size={13} />

                        {nombreTienda(
                          notificacion.tiendaDestinoId
                        )}
                      </div>


                      {esAdministrador ? (
                        <div className="notification-card__admin-status">

                          <div className="notification-card__summary">
                            <CheckCircle2
                              size={15}
                            />

                            <strong>
                              {confirmadas.length}/{destinos.length}
                            </strong>

                            <span>
                              tiendas confirmaron recepción
                            </span>
                          </div>


                          <div className="notification-card__stores">

                            {destinos.map(
                              (tiendaId) => {
                                const recibida =
                                  confirmacionDe(
                                    notificacion.id,
                                    tiendaId
                                  );

                                return (
                                  <div
                                    key={
                                      tiendaId
                                    }
                                    className={
                                      recibida
                                        ? "notification-store notification-store--confirmed"
                                        : "notification-store notification-store--pending"
                                    }
                                  >
                                    <span>
                                      {nombreTienda(
                                        tiendaId
                                      )}
                                    </span>

                                    {recibida ? (
                                      <span>
                                        <Check
                                          size={12}
                                        />
                                        Confirmado
                                      </span>
                                    ) : (
                                      <span>
                                        <Clock3
                                          size={12}
                                        />
                                        Pendiente
                                      </span>
                                    )}
                                  </div>
                                );
                              }
                            )}

                          </div>


                          <button
                            type="button"
                            className="notification-card__deactivate"
                            onClick={() =>
                              desactivar(
                                notificacion
                              )
                            }
                          >
                            Cerrar notificación
                          </button>

                        </div>
                      ) : (
                        <div className="notification-card__confirmation">

                          {miConfirmacion ? (
                            <div className="notification-card__confirmed">
                              <CheckCircle2
                                size={16}
                              />

                              <div>
                                <strong>
                                  Recepción confirmada
                                </strong>

                                <span>
                                  {fechaTexto(
                                    miConfirmacion.fechaConfirmacion
                                  )}
                                </span>
                              </div>
                            </div>
                          ) : (
                            <button
                              type="button"
                              className="notification-card__confirm-button"
                              onClick={() =>
                                confirmar(
                                  notificacion
                                )
                              }
                              disabled={
                                confirmandoId ===
                                notificacion.id
                              }
                            >
                              <CheckCircle2
                                size={16}
                              />

                              {confirmandoId ===
                              notificacion.id
                                ? "Confirmando..."
                                : "Confirmar recepción"}
                            </button>
                          )}

                        </div>
                      )}

                    </article>
                  );
                }
              )
            )}

          </div>

        </div>
      )}

    </div>
  );
}


export default NotificationBell;
