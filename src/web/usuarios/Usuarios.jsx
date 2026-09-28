import {
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  ChevronDown,
  ChevronUp,
  KeyRound,
  Pencil,
  Plus,
  Search,
  ShieldCheck,
  Store,
  UserCheck,
  UserRound,
  UserX,
  X,
} from "lucide-react";

import {
  auth,
} from "../../firebase/firebaseConfig";

import {
  useTienda,
} from "../../context/TiendaContext";

import {
  cambiarEstadoUsuario,
  crearUsuario,
  editarUsuario,
  enviarRestablecimientoPassword,
  obtenerPermisosPorRol,
  suscribirseUsuarios,
} from "../../services/usuariosService";

import "./Usuarios.css";


const MODULOS = [
  {
    clave: "dashboard",
    nombre: "Dashboard",
    acciones: ["ver"],
  },
  {
    clave: "caja",
    nombre: "Caja",
    acciones: ["ver", "abrir", "cerrar"],
  },
  {
    clave: "ventas",
    nombre: "Ventas",
    acciones: ["ver", "crear", "editar", "eliminar"],
  },
  {
    clave: "gastos",
    nombre: "Gastos",
    acciones: ["ver", "crear", "editar", "eliminar"],
  },
  {
    clave: "ingresos",
    nombre: "Ingresos",
    acciones: ["ver", "crear", "editar", "eliminar"],
  },
  {
    clave: "retiros",
    nombre: "Retiros",
    acciones: ["ver", "crear", "editar", "eliminar"],
  },
  {
    clave: "inventario",
    nombre: "Inventario",
    acciones: ["ver"],
  },
  {
    clave: "equipos",
    nombre: "Equipos",
    acciones: ["ver", "crear", "editar", "transferir", "eliminar"],
  },
  {
    clave: "cierres",
    nombre: "Cierres",
    acciones: ["ver", "crear"],
  },
  {
    clave: "reportes",
    nombre: "Reportes",
    acciones: ["ver", "exportar"],
  },
  {
    clave: "usuarios",
    nombre: "Usuarios",
    acciones: ["ver", "crear", "editar", "desactivar"],
  },
  {
    clave: "tiendas",
    nombre: "Tiendas",
    acciones: ["ver", "crear", "editar"],
  },
];

const NOMBRES_ACCION = {
  ver: "Ver",
  crear: "Crear",
  editar: "Editar",
  eliminar: "Eliminar",
  abrir: "Abrir",
  cerrar: "Cerrar",
  transferir: "Transferir",
  exportar: "Exportar",
  desactivar: "Desactivar",
};

const formularioInicial = {
  nombre: "",
  correo: "",
  password: "",
  rol: "vendedor",
  tiendasPermitidas: [],
  permisos: obtenerPermisosPorRol("vendedor"),
};


function Usuarios() {
  const {
    tiendas,
  } = useTienda();

  const [
    usuarios,
    setUsuarios,
  ] = useState([]);

  const [
    busqueda,
    setBusqueda,
  ] = useState("");

  const [
    filtroRol,
    setFiltroRol,
  ] = useState("todos");

  const [
    filtroEstado,
    setFiltroEstado,
  ] = useState("todos");

  const [
    filtroTienda,
    setFiltroTienda,
  ] = useState("todas");

  const [
    mostrarFormulario,
    setMostrarFormulario,
  ] = useState(false);

  const [
    usuarioEditando,
    setUsuarioEditando,
  ] = useState(null);

  const [
    formulario,
    setFormulario,
  ] = useState(
    formularioInicial
  );

  const [
    guardando,
    setGuardando,
  ] = useState(false);

  const [
    procesandoId,
    setProcesandoId,
  ] = useState(null);

  const [
    error,
    setError,
  ] = useState("");

  const [
    mostrarPermisos,
    setMostrarPermisos,
  ] = useState(true);


  /* =========================================================
     FIREBASE
  ========================================================= */

  useEffect(() => {
    const cancelar =
      suscribirseUsuarios(
        setUsuarios
      );

    return cancelar;
  }, []);


  /* =========================================================
     UTILIDADES
  ========================================================= */

  function nombreTienda(id) {
    if (
      id === "todas"
    ) {
      return "TODAS";
    }

    return (
      tiendas.find(
        (tienda) =>
          tienda.id === id
      )?.nombre ||
      id?.toUpperCase() ||
      "-"
    );
  }


  function nombreRol(rol) {
    if (
      rol ===
      "administrador"
    ) {
      return "Administrador";
    }

    if (
      rol ===
      "encargado"
    ) {
      return "Encargado";
    }

    if (
      rol ===
      "personalizado"
    ) {
      return "Personalizado";
    }

    return "Vendedor";
  }


  function nombresTiendasUsuario(
    usuario
  ) {
    const permitidas =
      usuario.tiendasPermitidas ||
      (
        usuario.tiendaId
          ? [usuario.tiendaId]
          : []
      );

    if (
      permitidas.includes(
        "todas"
      )
    ) {
      return "TODAS";
    }

    if (
      permitidas.length ===
      0
    ) {
      return "-";
    }

    return permitidas
      .map(
        nombreTienda
      )
      .join(", ");
  }


  /* =========================================================
     RESUMEN
  ========================================================= */

  const resumen =
    useMemo(() => {
      return {
        total:
          usuarios.length,

        activos:
          usuarios.filter(
            (usuario) =>
              usuario.activo !==
              false
          ).length,

        administradores:
          usuarios.filter(
            (usuario) =>
              usuario.rol ===
              "administrador"
          ).length,

        personalizados:
          usuarios.filter(
            (usuario) =>
              usuario.rol ===
              "personalizado"
          ).length,
      };
    }, [usuarios]);


  /* =========================================================
     FILTRADO
  ========================================================= */

  const usuariosMostrados =
    useMemo(() => {
      const texto =
        busqueda
          .trim()
          .toLowerCase();

      return usuarios.filter(
        (usuario) => {
          const estado =
            usuario.activo ===
            false
              ? "inactivo"
              : "activo";

          if (
            filtroRol !==
              "todos" &&
            usuario.rol !==
              filtroRol
          ) {
            return false;
          }

          if (
            filtroEstado !==
              "todos" &&
            estado !==
              filtroEstado
          ) {
            return false;
          }

          const permitidas =
            usuario.tiendasPermitidas ||
            (
              usuario.tiendaId
                ? [
                    usuario.tiendaId,
                  ]
                : []
            );

          if (
            filtroTienda !==
              "todas" &&
            !permitidas.includes(
              "todas"
            ) &&
            !permitidas.includes(
              filtroTienda
            )
          ) {
            return false;
          }

          if (!texto) {
            return true;
          }

          const contenido = [
            usuario.nombre,
            usuario.correo,
            nombreRol(
              usuario.rol
            ),
            nombresTiendasUsuario(
              usuario
            ),
          ]
            .filter(Boolean)
            .join(" ")
            .toLowerCase();

          return contenido.includes(
            texto
          );
        }
      );
    }, [
      usuarios,
      busqueda,
      filtroRol,
      filtroEstado,
      filtroTienda,
      tiendas,
    ]);


  /* =========================================================
     FORMULARIO
  ========================================================= */

  function abrirFormulario() {
    setUsuarioEditando(
      null
    );

    setFormulario({
      ...formularioInicial,

      tiendasPermitidas:
        [],

      permisos:
        obtenerPermisosPorRol(
          "vendedor"
        ),
    });

    setError("");

    setMostrarPermisos(
      true
    );

    setMostrarFormulario(
      true
    );
  }


  function abrirEdicion(
    usuario
  ) {
    const tiendasActuales =
      usuario.tiendasPermitidas ||
      (
        usuario.tiendaId
          ? [usuario.tiendaId]
          : []
      );

    setUsuarioEditando(
      usuario
    );

    setFormulario({
      nombre:
        usuario.nombre ||
        "",

      correo:
        usuario.correo ||
        "",

      password:
        "",

      rol:
        usuario.rol ||
        "vendedor",

      tiendasPermitidas:
        tiendasActuales,

      permisos:
        usuario.permisos ||
        obtenerPermisosPorRol(
          usuario.rol ||
            "vendedor"
        ),
    });

    setError("");

    setMostrarPermisos(
      true
    );

    setMostrarFormulario(
      true
    );
  }


  function cerrarFormulario() {
    if (guardando) {
      return;
    }

    setMostrarFormulario(
      false
    );

    setUsuarioEditando(
      null
    );

    setFormulario(
      formularioInicial
    );

    setError("");
  }


  function cambiarCampo(
    event
  ) {
    const {
      name,
      value,
    } = event.target;

    if (
      name === "rol"
    ) {
      setFormulario(
        (anterior) => ({
          ...anterior,

          rol:
            value,

          tiendasPermitidas:
            anterior
              .tiendasPermitidas
              .filter(
                (id) =>
                  id !==
                  "todas"
              ),

          permisos:
            obtenerPermisosPorRol(
              value
            ),
        })
      );

      return;
    }

    setFormulario(
      (anterior) => ({
        ...anterior,

        [name]:
          value,
      })
    );
  }


  function alternarTienda(
    tiendaId
  ) {
    setFormulario(
      (anterior) => {
        const actuales =
          anterior
            .tiendasPermitidas ||
          [];

        const existe =
          actuales.includes(
            tiendaId
          );

        return {
          ...anterior,

          tiendasPermitidas:
            existe
              ? actuales.filter(
                  (id) =>
                    id !==
                    tiendaId
                )
              : [
                  ...actuales,
                  tiendaId,
                ],
        };
      }
    );
  }


  function cambiarPermiso(
    modulo,
    accion
  ) {
    setFormulario(
      (anterior) => ({
        ...anterior,

        permisos: {
          ...anterior.permisos,

          [modulo]: {
            ...anterior
              .permisos[
                modulo
              ],

            [accion]:
              !anterior
                .permisos?.[
                  modulo
                ]?.[
                  accion
                ],
          },
        },
      })
    );
  }


  function marcarModuloCompleto(
    modulo,
    acciones,
    valor
  ) {
    setFormulario(
      (anterior) => {
        const nuevoModulo =
          {};

        acciones.forEach(
          (accion) => {
            nuevoModulo[
              accion
            ] =
              valor;
          }
        );

        return {
          ...anterior,

          permisos: {
            ...anterior.permisos,

            [modulo]:
              nuevoModulo,
          },
        };
      }
    );
  }


  /* =========================================================
     GUARDAR
  ========================================================= */

  async function guardarUsuario(
    event
  ) {
    event.preventDefault();

    setError("");

    if (
      !formulario.nombre.trim()
    ) {
      setError(
        "Ingresa el nombre."
      );

      return;
    }

    if (
      !usuarioEditando &&
      !formulario.correo.trim()
    ) {
      setError(
        "Ingresa el correo."
      );

      return;
    }

    if (
      !usuarioEditando &&
      formulario.password.length <
        6
    ) {
      setError(
        "La contraseña debe tener al menos 6 caracteres."
      );

      return;
    }

    if (
      formulario
        .tiendasPermitidas
        .filter(
          (id) =>
            id !==
            "todas"
        )
        .length === 0
    ) {
      setError(
        "Selecciona al menos una tienda."
      );

      return;
    }

    try {
      setGuardando(
        true
      );

      if (
        usuarioEditando
      ) {
        await editarUsuario(
          usuarioEditando.id,
          {
            nombre:
              formulario.nombre,

            rol:
              formulario.rol,

            tiendasPermitidas:
              formulario.tiendasPermitidas,

            permisos:
              formulario.permisos,
          }
        );
      } else {
        await crearUsuario({
          nombre:
            formulario.nombre,

          correo:
            formulario.correo,

          password:
            formulario.password,

          rol:
            formulario.rol,

          tiendasPermitidas:
            formulario.tiendasPermitidas,

          permisos:
            formulario.permisos,
        });
      }

      setMostrarFormulario(
        false
      );

      setUsuarioEditando(
        null
      );

      setFormulario(
        formularioInicial
      );
    } catch (
      errorGuardado
    ) {
      console.error(
        "Error guardando usuario:",
        errorGuardado
      );

      let mensaje =
        errorGuardado.message ||
        "No se pudo guardar el usuario.";

      if (
        errorGuardado.code ===
        "auth/email-already-in-use"
      ) {
        mensaje =
          "Este correo ya está registrado.";
      }

      if (
        errorGuardado.code ===
        "auth/invalid-email"
      ) {
        mensaje =
          "El correo no es válido.";
      }

      setError(
        mensaje
      );
    } finally {
      setGuardando(
        false
      );
    }
  }


  /* =========================================================
     ESTADO / CONTRASEÑA
  ========================================================= */

  async function alternarEstado(
    usuario
  ) {
    if (
      !usuario?.id ||
      procesandoId
    ) {
      return;
    }

    const nuevoEstado =
      usuario.activo ===
      false;

    const accion =
      nuevoEstado
        ? "activar"
        : "desactivar";

    const confirmar =
      window.confirm(
        `¿Deseas ${accion} a ${usuario.nombre || usuario.correo}?`
      );

    if (!confirmar) {
      return;
    }

    try {
      setProcesandoId(
        usuario.id
      );

      await cambiarEstadoUsuario(
        usuario.id,
        nuevoEstado
      );
    } catch (
      errorEstado
    ) {
      window.alert(
        errorEstado.message ||
          "No se pudo cambiar el estado del usuario."
      );
    } finally {
      setProcesandoId(
        null
      );
    }
  }


  async function restablecerPassword(
    usuario
  ) {
    if (
      !usuario?.correo ||
      procesandoId
    ) {
      return;
    }

    const confirmar =
      window.confirm(
        `¿Enviar correo de restablecimiento de contraseña a ${usuario.correo}?`
      );

    if (!confirmar) {
      return;
    }

    try {
      setProcesandoId(
        usuario.id
      );

      await enviarRestablecimientoPassword(
        usuario.correo
      );

      window.alert(
        "Correo de restablecimiento enviado."
      );
    } catch (
      errorPassword
    ) {
      window.alert(
        errorPassword.message ||
          "No se pudo enviar el correo."
      );
    } finally {
      setProcesandoId(
        null
      );
    }
  }


  return (
    <div className="usuarios-page">

      <div className="usuarios-header">

        <div>
          <h1>
            Usuarios
          </h1>

          <p>
            Cuentas, tiendas permitidas y permisos por módulo.
          </p>
        </div>

        <button
          type="button"
          className="usuarios-add"
          onClick={
            abrirFormulario
          }
        >
          <Plus
            size={18}
          />

          Nuevo usuario
        </button>

      </div>


      <section className="usuarios-summary">

        <article>
          <UserRound
            size={20}
          />

          <span>
            Total
          </span>

          <strong>
            {
              resumen.total
            }
          </strong>
        </article>


        <article>
          <UserCheck
            size={20}
          />

          <span>
            Activos
          </span>

          <strong>
            {
              resumen.activos
            }
          </strong>
        </article>


        <article>
          <ShieldCheck
            size={20}
          />

          <span>
            Administradores
          </span>

          <strong>
            {
              resumen.administradores
            }
          </strong>
        </article>


        <article>
          <Store
            size={20}
          />

          <span>
            Personalizados
          </span>

          <strong>
            {
              resumen.personalizados
            }
          </strong>
        </article>

      </section>


      <div className="usuarios-toolbar">

        <div className="usuarios-search">

          <Search
            size={18}
          />

          <input
            type="text"
            placeholder="Buscar nombre, correo, rol o tienda..."
            value={
              busqueda
            }
            onChange={(event) =>
              setBusqueda(
                event.target.value
              )
            }
          />

        </div>


        <select
          value={
            filtroRol
          }
          onChange={(event) =>
            setFiltroRol(
              event.target.value
            )
          }
        >
          <option value="todos">
            Todos los roles
          </option>

          <option value="administrador">
            Administradores
          </option>

          <option value="encargado">
            Encargados
          </option>

          <option value="vendedor">
            Vendedores
          </option>

          <option value="personalizado">
            Personalizados
          </option>
        </select>


        <select
          value={
            filtroEstado
          }
          onChange={(event) =>
            setFiltroEstado(
              event.target.value
            )
          }
        >
          <option value="todos">
            Todos los estados
          </option>

          <option value="activo">
            Activos
          </option>

          <option value="inactivo">
            Inactivos
          </option>
        </select>


        <select
          value={
            filtroTienda
          }
          onChange={(event) =>
            setFiltroTienda(
              event.target.value
            )
          }
        >
          <option value="todas">
            Todas las tiendas
          </option>

          {tiendas.map(
            (tienda) => (
              <option
                key={
                  tienda.id
                }
                value={
                  tienda.id
                }
              >
                {
                  tienda.nombre
                }
              </option>
            )
          )}
        </select>

      </div>


      <div className="usuarios-table-card">

        <div className="usuarios-table-scroll">

          <table className="usuarios-table">

            <thead>
              <tr>
                <th>
                  Usuario
                </th>

                <th>
                  Correo
                </th>

                <th>
                  Rol
                </th>

                <th>
                  Tiendas permitidas
                </th>

                <th>
                  Estado
                </th>

                <th>
                  Acciones
                </th>
              </tr>
            </thead>


            <tbody>

              {usuariosMostrados.length ===
              0 ? (

                <tr>
                  <td colSpan="6">

                    <div className="usuarios-empty">

                      <UserRound
                        size={34}
                      />

                      <strong>
                        Sin usuarios registrados
                      </strong>

                      <span>
                        Los usuarios creados aparecerán aquí.
                      </span>

                    </div>

                  </td>
                </tr>

              ) : (

                usuariosMostrados.map(
                  (usuario) => {
                    const activo =
                      usuario.activo !==
                      false;

                    const propio =
                      usuario.id ===
                      auth.currentUser?.uid;

                    return (
                      <tr
                        key={
                          usuario.id
                        }
                      >

                        <td>
                          <div className="usuario-name">

                            <span className="usuario-avatar">
                              {String(
                                usuario.nombre ||
                                  usuario.correo ||
                                  "U"
                              )
                                .charAt(
                                  0
                                )
                                .toUpperCase()}
                            </span>

                            <div>
                              <strong>
                                {usuario.nombre ||
                                  "Sin nombre"}
                              </strong>

                              {propio && (
                                <small>
                                  Tu cuenta
                                </small>
                              )}

                              {usuario.superAdmin && (
                                <small className="usuario-superadmin">
                                  Super Admin
                                </small>
                              )}
                            </div>

                          </div>
                        </td>


                        <td>
                          {
                            usuario.correo ||
                            "-"
                          }
                        </td>


                        <td>
                          <span
                            className={`usuario-role usuario-role--${usuario.rol || "vendedor"}`}
                          >
                            {nombreRol(
                              usuario.rol
                            )}
                          </span>
                        </td>


                        <td className="usuario-tiendas">
                          {nombresTiendasUsuario(
                            usuario
                          )}
                        </td>


                        <td>
                          <span
                            className={`usuario-status usuario-status--${
                              activo
                                ? "activo"
                                : "inactivo"
                            }`}
                          >
                            {activo
                              ? "Activo"
                              : "Inactivo"}
                          </span>
                        </td>


                        <td>
                          <div className="usuarios-actions">

                            <button
                              type="button"
                              className="icon-action"
                              title="Editar usuario"
                              disabled={
                                procesandoId ===
                                usuario.id
                              }
                              onClick={() =>
                                abrirEdicion(
                                  usuario
                                )
                              }
                            >
                              <Pencil
                                size={15}
                              />
                            </button>


                            <button
                              type="button"
                              className="icon-action"
                              title="Restablecer contraseña"
                              disabled={
                                procesandoId ===
                                usuario.id
                              }
                              onClick={() =>
                                restablecerPassword(
                                  usuario
                                )
                              }
                            >
                              <KeyRound
                                size={15}
                              />
                            </button>


                            <button
                              type="button"
                              className={`icon-action ${
                                activo
                                  ? "icon-action--danger"
                                  : "icon-action--success"
                              }`}
                              title={
                                propio
                                  ? "No puedes desactivar tu propia cuenta"
                                  : activo
                                  ? "Desactivar usuario"
                                  : "Activar usuario"
                              }
                              disabled={
                                propio ||
                                usuario.superAdmin ||
                                procesandoId ===
                                  usuario.id
                              }
                              onClick={() =>
                                alternarEstado(
                                  usuario
                                )
                              }
                            >
                              {activo ? (
                                <UserX
                                  size={15}
                                />
                              ) : (
                                <UserCheck
                                  size={15}
                                />
                              )}
                            </button>

                          </div>
                        </td>

                      </tr>
                    );
                  }
                )

              )}

            </tbody>

          </table>

        </div>

      </div>


      {mostrarFormulario && (

        <div className="usuarios-modal-overlay">

          <div className="usuarios-modal usuarios-modal--wide">

            <div className="usuarios-modal__header">

              <div>
                <h2>
                  {usuarioEditando
                    ? "Editar usuario"
                    : "Nuevo usuario"}
                </h2>

                <p>
                  Define exactamente qué tiendas y funciones puede usar.
                </p>
              </div>


              <button
                type="button"
                onClick={
                  cerrarFormulario
                }
                disabled={
                  guardando
                }
              >
                <X
                  size={20}
                />
              </button>

            </div>


            <form
              className="usuarios-form"
              onSubmit={
                guardarUsuario
              }
            >

              <div className="usuarios-form__grid">

                <label>
                  Nombre *

                  <input
                    type="text"
                    name="nombre"
                    value={
                      formulario.nombre
                    }
                    onChange={
                      cambiarCampo
                    }
                    placeholder="Nombre completo"
                  />
                </label>


                <label>
                  Correo *

                  <input
                    type="email"
                    name="correo"
                    value={
                      formulario.correo
                    }
                    onChange={
                      cambiarCampo
                    }
                    placeholder="usuario@correo.com"
                    readOnly={
                      Boolean(
                        usuarioEditando
                      )
                    }
                  />
                </label>


                {!usuarioEditando && (

                  <label>
                    Contraseña *

                    <input
                      type="password"
                      name="password"
                      value={
                        formulario.password
                      }
                      onChange={
                        cambiarCampo
                      }
                      placeholder="Mínimo 6 caracteres"
                      autoComplete="new-password"
                    />
                  </label>

                )}


                <label>
                  Plantilla / Rol *

                  <select
                    name="rol"
                    value={
                      formulario.rol
                    }
                    onChange={
                      cambiarCampo
                    }
                  >
                    <option value="administrador">
                      Administrador
                    </option>

                    <option value="encargado">
                      Encargado
                    </option>

                    <option value="vendedor">
                      Vendedor
                    </option>

                    <option value="personalizado">
                      Personalizado
                    </option>
                  </select>
                </label>

              </div>


              <section className="usuarios-section">

                <div className="usuarios-section__header">

                  <div>
                    <strong>
                      Tiendas permitidas
                    </strong>

                    <span>
                      Selecciona una o varias tiendas. Solo el Super Admin tiene acceso general.
                    </span>
                  </div>

                </div>


                <div className="usuarios-store-grid">

                  {tiendas.map(
                    (tienda) => (
                      <label
                        className="usuarios-check-card"
                        key={
                          tienda.id
                        }
                      >
                        <input
                          type="checkbox"
                          checked={
                            formulario
                              .tiendasPermitidas
                              .includes(
                                tienda.id
                              )
                          }
                          onChange={() =>
                            alternarTienda(
                              tienda.id
                            )
                          }
                        />

                        <span>
                          {
                            tienda.nombre
                          }
                        </span>
                      </label>
                    )
                  )}

                </div>

              </section>


              <section className="usuarios-section">

                <button
                  type="button"
                  className="usuarios-permissions-toggle"
                  onClick={() =>
                    setMostrarPermisos(
                      (valor) =>
                        !valor
                    )
                  }
                >
                  <div>
                    <strong>
                      Permisos
                    </strong>

                    <span>
                      Activa solo lo que esta persona podrá hacer.
                    </span>
                  </div>

                  {mostrarPermisos ? (
                    <ChevronUp
                      size={18}
                    />
                  ) : (
                    <ChevronDown
                      size={18}
                    />
                  )}
                </button>


                {mostrarPermisos && (

                  <div className="usuarios-permissions">

                    {MODULOS.map(
                      (modulo) => {
                        const todos =
                          modulo.acciones.every(
                            (accion) =>
                              Boolean(
                                formulario
                                  .permisos?.[
                                    modulo.clave
                                  ]?.[
                                    accion
                                  ]
                              )
                          );

                        return (
                          <div
                            className="usuarios-permission-row"
                            key={
                              modulo.clave
                            }
                          >

                            <div className="usuarios-permission-module">

                              <strong>
                                {
                                  modulo.nombre
                                }
                              </strong>

                              <label className="usuarios-check-all">
                                <input
                                  type="checkbox"
                                  checked={
                                    todos
                                  }
                                  onChange={(event) =>
                                    marcarModuloCompleto(
                                      modulo.clave,
                                      modulo.acciones,
                                      event.target.checked
                                    )
                                  }
                                />

                                Todo
                              </label>

                            </div>


                            <div className="usuarios-permission-actions">

                              {modulo.acciones.map(
                                (accion) => (
                                  <label
                                    className="usuarios-permission-check"
                                    key={
                                      accion
                                    }
                                  >
                                    <input
                                      type="checkbox"
                                      checked={
                                        Boolean(
                                          formulario
                                            .permisos?.[
                                              modulo.clave
                                            ]?.[
                                              accion
                                            ]
                                        )
                                      }
                                      onChange={() =>
                                        cambiarPermiso(
                                          modulo.clave,
                                          accion
                                        )
                                      }
                                    />

                                    {
                                      NOMBRES_ACCION[
                                        accion
                                      ]
                                    }
                                  </label>
                                )
                              )}

                            </div>

                          </div>
                        );
                      }
                    )}

                  </div>

                )}

              </section>


              {error && (

                <div className="usuarios-form__error">
                  {error}
                </div>

              )}


              <div className="usuarios-form__actions">

                <button
                  type="button"
                  className="usuarios-cancel"
                  onClick={
                    cerrarFormulario
                  }
                  disabled={
                    guardando
                  }
                >
                  Cancelar
                </button>


                <button
                  type="submit"
                  className="usuarios-save"
                  disabled={
                    guardando
                  }
                >
                  {guardando
                    ? "Guardando..."
                    : usuarioEditando
                    ? "Guardar cambios"
                    : "Crear usuario"}
                </button>

              </div>

            </form>

          </div>

        </div>

      )}

    </div>
  );
}


export default Usuarios;