import {
  Fragment,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import {
  ArrowRightLeft,
  ChevronDown,
  ChevronRight,
  Eye,
  EyeOff,
  Pencil,
  Plus,
  Search,
  Smartphone,
  Trash2,
  Tablet,
  X,
} from "lucide-react";

import {
  useTienda,
} from "../../context/TiendaContext";

import {
  useAuth,
} from "../../context/AuthContext";

import {
  crearEquipo,
  editarEquipo,
  eliminarEquipo,
  suscribirseEquipos,
  transferirEquipo,
} from "../../services/equiposService";

import "./Equipos.css";


const formularioInicial = {
  tipo: "celular",
  marca: "",
  modelo: "",
  cantidad: "1",
  ram: "",
  almacenamiento: "",
  color: "",
  imeis: [""],
  precioVenta: "",
  precioFinanciamiento: "",
  ubicacionActual: "",
};


function Equipos() {
  const {
    tiendas,
    tiendaActiva,
  } = useTienda();

  const {
    perfil,
  } = useAuth();

  const esSuperAdmin =
    perfil?.superAdmin ===
    true;

  const permisosEquipos =
    perfil?.permisos?.equipos ||
    {};

  const puedeCrearEquipo =
    esSuperAdmin ||
    permisosEquipos.crear ===
      true;

  const puedeEditarEquipo =
    esSuperAdmin ||
    permisosEquipos.editar ===
      true;

  const puedeTransferirEquipo =
    esSuperAdmin ||
    permisosEquipos.transferir ===
      true;

  const puedeEliminarEquipo =
    esSuperAdmin ||
    permisosEquipos.eliminar ===
      true;

  const tiendasPermitidasUsuario =
    useMemo(() => {
      const ids =
        new Set();

      if (
        Array.isArray(
          perfil?.tiendasPermitidas
        )
      ) {
        perfil.tiendasPermitidas.forEach(
          (id) => {
            const limpio =
              String(
                id || ""
              )
                .trim()
                .toLowerCase();

            if (
              limpio &&
              limpio !==
                "todas"
            ) {
              ids.add(
                limpio
              );
            }
          }
        );
      }

      const principal =
        String(
          perfil?.tiendaId ||
          ""
        )
          .trim()
          .toLowerCase();

      if (
        principal &&
        principal !== "todas"
      ) {
        ids.add(
          principal
        );
      }

      return Array.from(
        ids
      );
    }, [
      perfil?.tiendaId,
      perfil?.tiendasPermitidas,
    ]);

  function puedeGestionarTienda(
    tiendaId
  ) {
    if (esSuperAdmin) {
      return true;
    }

    return tiendasPermitidasUsuario.includes(
      String(
        tiendaId || ""
      )
        .trim()
        .toLowerCase()
    );
  }

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

  const tiendasGestionables =
    useMemo(
      () =>
        esSuperAdmin
          ? tiendasActivas
          : tiendasActivas.filter(
              (tienda) =>
                puedeGestionarTienda(
                  tienda.id
                )
            ),
      [
        esSuperAdmin,
        tiendasActivas,
        tiendasPermitidasUsuario,
      ]
    );

  const [
    equipos,
    setEquipos,
  ] = useState([]);

  const [
    busqueda,
    setBusqueda,
  ] = useState("");

  const [
    filtroTienda,
    setFiltroTienda,
  ] = useState("todas");

  const [
    filtroEstado,
    setFiltroEstado,
  ] = useState("todos");

  const [
    filtroTipo,
    setFiltroTipo,
  ] = useState("todos");

  const [
    filtroMarca,
    setFiltroMarca,
  ] = useState("todas");

  const [
    gruposAbiertos,
    setGruposAbiertos,
  ] = useState({});

  const [
    mostrarFormulario,
    setMostrarFormulario,
  ] = useState(false);

  const [
    equipoEditando,
    setEquipoEditando,
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
    mensajeError,
    setMensajeError,
  ] = useState("");

  const [
    preciosVisibles,
    setPreciosVisibles,
  ] = useState({});

  const temporizadores =
    useRef({});

  const [
    equipoTransferencia,
    setEquipoTransferencia,
  ] = useState(null);

  const [
    destinoId,
    setDestinoId,
  ] = useState("");

  const [
    observacion,
    setObservacion,
  ] = useState("");

  const [
    transfiriendo,
    setTransfiriendo,
  ] = useState(false);


  const [
    eliminandoId,
    setEliminandoId,
  ] = useState(null);


  const moneda =
    new Intl.NumberFormat(
      "es-PE",
      {
        style: "currency",
        currency: "PEN",
      }
    );


  /* =========================================================
     FIREBASE
  ========================================================= */

  useEffect(() => {
    const cancelar =
      suscribirseEquipos(
        setEquipos
      );

    return cancelar;
  }, []);


  useEffect(() => {
    return () => {
      Object.values(
        temporizadores.current
      ).forEach(
        clearTimeout
      );
    };
  }, []);


  /* =========================================================
     UTILIDADES
  ========================================================= */

  function nombreTienda(id) {
    return (
      tiendas.find(
        (item) =>
          item.id === id
      )?.nombre ||
      id?.toUpperCase() ||
      "SIN UBICACIÓN"
    );
  }


  function tipoEquipo(equipo) {
    const tipo =
      String(
        equipo.tipo ||
          "celular"
      ).toLowerCase();

    if (tipo === "tablet") {
      return "Tablet";
    }

    if (tipo === "otro") {
      return "Otro";
    }

    return "Celular";
  }


  function estadoEquipo(equipo) {
    return equipo.estado ===
      "vendido"
      ? "Vendido"
      : "Disponible";
  }


  function valorGb(valor) {
    if (
      valor === "" ||
      valor === null ||
      valor === undefined
    ) {
      return "-";
    }

    const limpio =
      String(valor)
        .replace(
          /\s*gb\s*/gi,
          ""
        )
        .trim();

    return limpio
      ? `${limpio} GB`
      : "-";
  }


  /* =========================================================
     INVENTARIO GLOBAL

     Todos los usuarios que pueden entrar al módulo Equipos
     consultan el inventario de TODAS las tiendas.

     El selector de tienda de este módulo sirve únicamente
     como filtro visual. No cambia la tienda operativa del
     usuario ni sus permisos para editar/transferir.
  ========================================================= */

  const equiposDeTienda =
    useMemo(() => {
      if (
        filtroTienda ===
        "todas"
      ) {
        return equipos;
      }

      return equipos.filter(
        (equipo) =>
          equipo.ubicacionActual ===
          filtroTienda
      );
    }, [
      equipos,
      filtroTienda,
    ]);


  /* =========================================================
     MARCAS
  ========================================================= */

  const marcas =
    useMemo(() => {
      return [
        ...new Set(
          equiposDeTienda
            .map(
              (equipo) =>
                String(
                  equipo.marca ||
                    ""
                ).trim()
            )
            .filter(Boolean)
        ),
      ].sort(
        (a, b) =>
          a.localeCompare(
            b,
            "es"
          )
      );
    }, [equiposDeTienda]);


  /* =========================================================
     CONTADORES REALES
  ========================================================= */

  const resumen =
    useMemo(() => {
      const disponibles =
        equiposDeTienda.filter(
          (equipo) =>
            equipo.estado !==
            "vendido"
        );

      const porMarca =
        disponibles.reduce(
          (
            acumulado,
            equipo
          ) => {
            const marca =
              String(
                equipo.marca ||
                  "SIN MARCA"
              ).toUpperCase();

            acumulado[marca] =
              (
                acumulado[
                  marca
                ] || 0
              ) + 1;

            return acumulado;
          },
          {}
        );

      return {
        disponibles:
          disponibles.length,

        celulares:
          disponibles.filter(
            (equipo) =>
              String(
                equipo.tipo ||
                  "celular"
              ).toLowerCase() ===
              "celular"
          ).length,

        tablets:
          disponibles.filter(
            (equipo) =>
              String(
                equipo.tipo || ""
              ).toLowerCase() ===
              "tablet"
          ).length,

        otros:
          disponibles.filter(
            (equipo) =>
              String(
                equipo.tipo || ""
              ).toLowerCase() ===
              "otro"
          ).length,

        porMarca,
      };
    }, [equiposDeTienda]);


  /* =========================================================
     FILTROS
  ========================================================= */

  const equiposFiltrados =
    useMemo(() => {
      const texto =
        busqueda
          .trim()
          .toLowerCase();

      return equiposDeTienda.filter(
        (equipo) => {
          const estado =
            equipo.estado ===
            "vendido"
              ? "vendido"
              : "disponible";

          const tipo =
            String(
              equipo.tipo ||
                "celular"
            ).toLowerCase();

          const marca =
            String(
              equipo.marca || ""
            );

          if (
            filtroEstado !==
              "todos" &&
            estado !==
              filtroEstado
          ) {
            return false;
          }

          if (
            filtroTipo !==
              "todos" &&
            tipo !==
              filtroTipo
          ) {
            return false;
          }

          if (
            filtroMarca !==
              "todas" &&
            marca !==
              filtroMarca
          ) {
            return false;
          }

          if (!texto) {
            return true;
          }

          const contenido = [
            equipo.marca,
            equipo.modelo,
            equipo.tipo,
            equipo.ram,
            equipo.almacenamiento,
            equipo.color,
            equipo.imei,
            equipo.estado,
            nombreTienda(
              equipo.ubicacionActual
            ),
          ]
            .filter(
              (valor) =>
                valor !==
                  undefined &&
                valor !== null
            )
            .join(" ")
            .toLowerCase();

          return contenido.includes(
            texto
          );
        }
      );
    }, [
      equiposDeTienda,
      busqueda,
      filtroEstado,
      filtroTipo,
      filtroMarca,
      tiendas,
    ]);


  /* =========================================================
     AGRUPAR MODELOS PARA MOSTRAR CANTIDAD
  ========================================================= */

  const grupos =
    useMemo(() => {
      const mapa =
        new Map();

      equiposFiltrados.forEach(
        (equipo) => {
          const estado =
            equipo.estado ===
            "vendido"
              ? "vendido"
              : "disponible";

          const tipo =
            String(
              equipo.tipo ||
                "celular"
            ).toLowerCase();

          const clave = [
            String(
              equipo.marca || ""
            ).toUpperCase(),

            String(
              equipo.modelo || ""
            ).toUpperCase(),

            tipo,

            String(
              equipo.ram || ""
            ),

            String(
              equipo.almacenamiento ||
                ""
            ),

            String(
              equipo.color || ""
            ).toUpperCase(),

            String(
              equipo.ubicacionActual ||
                ""
            ),

            estado,

            Number(
              equipo.precioVenta ||
                0
            ),

            Number(
              equipo.precioFinanciamiento ||
                0
            ),
          ].join("|");

          if (
            !mapa.has(clave)
          ) {
            mapa.set(
              clave,
              {
                id: clave,

                muestra:
                  equipo,

                equipos:
                  [],
              }
            );
          }

          mapa
            .get(clave)
            .equipos.push(
              equipo
            );
        }
      );

      return Array.from(
        mapa.values()
      );
    }, [equiposFiltrados]);


  function alternarGrupo(id) {
    setGruposAbiertos(
      (anterior) => ({
        ...anterior,

        [id]:
          !anterior[id],
      })
    );
  }


  /* =========================================================
     FORMULARIO
  ========================================================= */

  function cambiarCampo(event) {
    const {
      name,
      value,
    } = event.target;

    setFormulario(
      (anterior) => ({
        ...anterior,
        [name]: value,
      })
    );
  }


  function cambiarCantidad(
    event
  ) {
    const valor =
      event.target.value;

    if (valor === "") {
      setFormulario(
        (anterior) => ({
          ...anterior,

          cantidad:
            "",

          imeis:
            anterior.imeis,
        })
      );

      return;
    }

    const numero =
      Math.max(
        1,
        Math.min(
          100,
          Math.floor(
            Number(valor) || 1
          )
        )
      );

    setFormulario(
      (anterior) => {
        const nuevos =
          Array.from(
            {
              length:
                numero,
            },
            (_, indice) =>
              anterior.imeis[
                indice
              ] || ""
          );

        return {
          ...anterior,

          cantidad:
            String(numero),

          imeis:
            nuevos,
        };
      }
    );
  }


  function cambiarImei(
    indice,
    valor
  ) {
    setFormulario(
      (anterior) => {
        const nuevos = [
          ...anterior.imeis,
        ];

        nuevos[indice] =
          valor;

        return {
          ...anterior,
          imeis: nuevos,
        };
      }
    );
  }


  function abrirFormulario() {
    setEquipoEditando(
      null
    );

    setMensajeError("");

    setFormulario({
      ...formularioInicial,

      imeis:
        [""],

      ubicacionActual:
        tiendaActiva?.id &&
        tiendaActiva.id !==
          "todas"
          ? tiendaActiva.id
          : "",
    });

    setMostrarFormulario(
      true
    );
  }


  function abrirEdicion(
    equipo
  ) {
    setEquipoEditando(
      equipo
    );

    setMensajeError("");

    setFormulario({
      tipo:
        equipo.tipo ||
        "celular",

      marca:
        equipo.marca ||
        "",

      modelo:
        equipo.modelo ||
        "",

      cantidad:
        "1",

      ram:
        String(
          equipo.ram ?? ""
        ).replace(
          /\s*gb\s*/gi,
          ""
        ),

      almacenamiento:
        String(
          equipo.almacenamiento ??
            ""
        ).replace(
          /\s*gb\s*/gi,
          ""
        ),

      color:
        equipo.color ||
        "",

      imeis:
        [
          equipo.imei ||
            "",
        ],

      precioVenta:
        String(
          equipo.precioVenta ??
            ""
        ),

      precioFinanciamiento:
        String(
          equipo.precioFinanciamiento ??
            ""
        ),

      ubicacionActual:
        equipo.ubicacionActual ||
        "",
    });

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

    setEquipoEditando(
      null
    );

    setMensajeError("");

    setFormulario(
      formularioInicial
    );
  }


  async function guardarEquipo(
    event
  ) {
    event.preventDefault();

    setMensajeError("");

    const cantidad =
      equipoEditando
        ? 1
        : Number(
            formulario.cantidad
          );

    if (
      !Number.isInteger(
        cantidad
      ) ||
      cantidad < 1 ||
      cantidad > 100
    ) {
      setMensajeError(
        "La cantidad debe estar entre 1 y 100."
      );

      return;
    }

    if (
      !formulario.tipo ||
      !formulario.marca.trim() ||
      !formulario.modelo.trim() ||
      !formulario.ram ||
      !formulario.almacenamiento ||
      !formulario.color.trim() ||
      !formulario.ubicacionActual
    ) {
      setMensajeError(
        "Completa todos los datos obligatorios."
      );

      return;
    }

    if (
      formulario.imeis
        .slice(
          0,
          cantidad
        )
        .some(
          (imei) =>
            !String(
              imei || ""
            ).trim()
        )
    ) {
      setMensajeError(
        `Debes ingresar ${
          cantidad === 1
            ? "el IMEI"
            : `los ${cantidad} IMEI`
        }.`
      );

      return;
    }

    try {
      setGuardando(
        true
      );

      if (
        equipoEditando
      ) {
        await editarEquipo(
          equipoEditando.id,
          {
            ...formulario,

            imei:
              formulario
                .imeis[0],
          }
        );
      } else {
        await crearEquipo({
          ...formulario,

          cantidad,

          imeis:
            formulario.imeis.slice(
              0,
              cantidad
            ),
        });
      }

      setMostrarFormulario(
        false
      );

      setEquipoEditando(
        null
      );

      setFormulario(
        formularioInicial
      );
    } catch (error) {
      console.error(error);

      setMensajeError(
        error.message ||
          "No se pudo guardar el equipo."
      );
    } finally {
      setGuardando(
        false
      );
    }
  }


  /* =========================================================
     PRECIO FINANCIAMIENTO
  ========================================================= */

  function mostrarPrecio(
    equipoId
  ) {
    if (
      temporizadores.current[
        equipoId
      ]
    ) {
      clearTimeout(
        temporizadores.current[
          equipoId
        ]
      );
    }

    setPreciosVisibles(
      (anterior) => ({
        ...anterior,

        [equipoId]:
          true,
      })
    );

    temporizadores.current[
      equipoId
    ] = setTimeout(
      () => {
        setPreciosVisibles(
          (anterior) => ({
            ...anterior,

            [equipoId]:
              false,
          })
        );
      },
      120000
    );
  }


  function ocultarPrecio(
    equipoId
  ) {
    if (
      temporizadores.current[
        equipoId
      ]
    ) {
      clearTimeout(
        temporizadores.current[
          equipoId
        ]
      );
    }

    setPreciosVisibles(
      (anterior) => ({
        ...anterior,

        [equipoId]:
          false,
      })
    );
  }


  /* =========================================================
     TRANSFERENCIA
  ========================================================= */

  function abrirTransferencia(
    equipo
  ) {
    if (
      equipo.estado ===
      "vendido"
    ) {
      window.alert(
        "Un equipo vendido no puede transferirse."
      );

      return;
    }

    setEquipoTransferencia(
      equipo
    );

    setDestinoId("");

    setObservacion("");
  }


  async function confirmarTransferencia(
    event
  ) {
    event.preventDefault();

    if (
      !equipoTransferencia ||
      !destinoId
    ) {
      return;
    }

    try {
      setTransfiriendo(
        true
      );

      await transferirEquipo(
        equipoTransferencia,
        destinoId,
        observacion
      );

      setEquipoTransferencia(
        null
      );

      setDestinoId("");

      setObservacion("");
    } catch (error) {
      console.error(error);

      window.alert(
        error.message ||
          "No se pudo transferir el equipo."
      );
    } finally {
      setTransfiriendo(
        false
      );
    }
  }


  /* =========================================================
     ELIMINAR EQUIPO DEFINITIVAMENTE
  ========================================================= */

  async function borrarEquipo(
    equipo
  ) {
    if (
      !equipo?.id ||
      eliminandoId
    ) {
      return;
    }

    if (
      equipo.estado ===
      "vendido"
    ) {
      window.alert(
        "No puedes eliminar un equipo vendido. Primero debes corregir o eliminar la venta relacionada."
      );

      return;
    }

    const confirmar =
      window.confirm(
        `¿Eliminar este equipo definitivamente?

${equipo.marca || ""} ${equipo.modelo || ""}
IMEI: ${equipo.imei || ""}

También se eliminarán sus movimientos de inventario.
Esta acción no se puede deshacer.`
      );

    if (!confirmar) {
      return;
    }

    try {
      setEliminandoId(
        equipo.id
      );

      await eliminarEquipo(
        equipo
      );
    } catch (error) {
      console.error(
        "Error eliminando equipo:",
        error
      );

      window.alert(
        error.message ||
          "No se pudo eliminar el equipo."
      );
    } finally {
      setEliminandoId(
        null
      );
    }
  }


  return (
    <div className="equipos-page">

      <div className="equipos-header">

        <div>
          <h1>
            Equipos
          </h1>

          <p>
            Inventario compartido de todas las tiendas. Puedes buscar un equipo y ver en qué tienda está disponible.
          </p>
        </div>

        {puedeCrearEquipo && (
          <button
            type="button"
            className="equipos-add"
            onClick={
              abrirFormulario
            }
          >
            <Plus size={18} />

            Registrar equipos
          </button>
        )}

      </div>


      <section className="equipos-summary">

        <article>
          <span>
            Disponibles
          </span>

          <strong>
            {resumen.disponibles}
          </strong>
        </article>

        <article>
          <span>
            Celulares
          </span>

          <strong>
            {resumen.celulares}
          </strong>
        </article>

        <article>
          <span>
            Tablets
          </span>

          <strong>
            {resumen.tablets}
          </strong>
        </article>

        <article>
          <span>
            Otros
          </span>

          <strong>
            {resumen.otros}
          </strong>
        </article>

      </section>


      <section className="equipos-marcas">

        <span className="equipos-marcas__title">
          Disponibles por marca
        </span>

        <div className="equipos-marcas__items">

          {Object.keys(
            resumen.porMarca
          ).length === 0 ? (

            <span className="equipos-marca-pill">
              Sin equipos disponibles
            </span>

          ) : (

            Object.entries(
              resumen.porMarca
            )
              .sort(
                (
                  [marcaA],
                  [marcaB]
                ) =>
                  marcaA.localeCompare(
                    marcaB,
                    "es"
                  )
              )
              .map(
                ([
                  marca,
                  cantidad,
                ]) => (
                  <span
                    className="equipos-marca-pill"
                    key={marca}
                  >
                    {marca}

                    <strong>
                      {cantidad}
                    </strong>
                  </span>
                )
              )

          )}

        </div>

      </section>


      <div className="equipos-toolbar">

        <div className="equipos-search">

          <Search size={18} />

          <input
            placeholder="Buscar marca, modelo, IMEI, color o tienda..."
            value={busqueda}
            onChange={(event) =>
              setBusqueda(
                event.target.value
              )
            }
          />

        </div>


        <select
          value={filtroTienda}
          onChange={(event) =>
            setFiltroTienda(
              event.target.value
            )
          }
        >
          <option value="todas">
            Todas las tiendas
          </option>

          {tiendasActivas.map(
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


        <select
          value={filtroEstado}
          onChange={(event) =>
            setFiltroEstado(
              event.target.value
            )
          }
        >
          <option value="todos">
            Todos los estados
          </option>

          <option value="disponible">
            Disponibles
          </option>

          <option value="vendido">
            Vendidos
          </option>
        </select>


        <select
          value={filtroTipo}
          onChange={(event) =>
            setFiltroTipo(
              event.target.value
            )
          }
        >
          <option value="todos">
            Todos los tipos
          </option>

          <option value="celular">
            Celulares
          </option>

          <option value="tablet">
            Tablets
          </option>

          <option value="otro">
            Otros
          </option>
        </select>


        <select
          value={filtroMarca}
          onChange={(event) =>
            setFiltroMarca(
              event.target.value
            )
          }
        >
          <option value="todas">
            Todas las marcas
          </option>

          {marcas.map(
            (marca) => (
              <option
                key={marca}
                value={marca}
              >
                {marca}
              </option>
            )
          )}
        </select>

      </div>


      <div className="equipos-table-card">

        <div className="equipos-table-scroll">

          <table className="equipos-table">

            <thead>
              <tr>
                <th>
                  Equipo
                </th>

                <th>
                  Tipo
                </th>

                <th>
                  RAM
                </th>

                <th>
                  Memoria
                </th>

                <th>
                  Tienda
                </th>

                <th>
                  Estado
                </th>

                <th className="equipos-cantidad-col">
                  Cantidad
                </th>

                <th>
                  Venta
                </th>

                <th>
                  Financ.
                </th>

                <th>
                  Unidades
                </th>
              </tr>
            </thead>


            <tbody>

              {grupos.length ===
              0 ? (

                <tr>
                  <td colSpan="10">

                    <div className="equipos-empty">

                      <Smartphone
                        size={34}
                      />

                      <strong>
                        No hay equipos
                      </strong>

                      <span>
                        No hay registros que coincidan con los filtros.
                      </span>

                    </div>

                  </td>
                </tr>

              ) : (

                grupos.map(
                  (grupo) => {
                    const equipo =
                      grupo.muestra;

                    const vendido =
                      equipo.estado ===
                      "vendido";

                    const abierto =
                      Boolean(
                        gruposAbiertos[
                          grupo.id
                        ]
                      );

                    const precioKey =
                      `grupo-${grupo.id}`;

                    const visible =
                      preciosVisibles[
                        precioKey
                      ];

                    return (
                      <Fragment
                        key={grupo.id}
                      >

                        <tr className="equipos-group-row">

                          <td>
                            <div className="equipo-name">

                              {String(
                                equipo.tipo ||
                                  "celular"
                              ).toLowerCase() ===
                              "tablet" ? (
                                <Tablet
                                  size={17}
                                />
                              ) : (
                                <Smartphone
                                  size={17}
                                />
                              )}

                              <div>
                                <strong>
                                  {equipo.marca}{" "}
                                  {equipo.modelo}
                                </strong>

                                <small>
                                  {equipo.color ||
                                    "-"}
                                </small>
                              </div>

                            </div>
                          </td>


                          <td>
                            {tipoEquipo(
                              equipo
                            )}
                          </td>


                          <td>
                            {valorGb(
                              equipo.ram
                            )}
                          </td>


                          <td>
                            {valorGb(
                              equipo.almacenamiento
                            )}
                          </td>


                          <td>
                            {nombreTienda(
                              equipo.ubicacionActual
                            )}
                          </td>


                          <td>
                            <span
                              className={`equipo-status equipo-status--${
                                vendido
                                  ? "vendido"
                                  : "disponible"
                              }`}
                            >
                              {estadoEquipo(
                                equipo
                              )}
                            </span>
                          </td>


                          <td className="equipos-cantidad-col">
                            <strong className="equipos-cantidad">
                              {
                                grupo
                                  .equipos
                                  .length
                              }
                            </strong>
                          </td>


                          <td>
                            <strong>
                              {moneda.format(
                                Number(
                                  equipo.precioVenta ||
                                    0
                                )
                              )}
                            </strong>
                          </td>


                          <td>
                            <div className="finance-inline">

                              <span>
                                {visible
                                  ? moneda.format(
                                      Number(
                                        equipo.precioFinanciamiento ||
                                          0
                                      )
                                    )
                                  : "S/ ••••"}
                              </span>

                              <button
                                type="button"
                                className="icon-action"
                                title={
                                  visible
                                    ? "Ocultar precio"
                                    : "Mostrar precio"
                                }
                                onClick={() =>
                                  visible
                                    ? ocultarPrecio(
                                        precioKey
                                      )
                                    : mostrarPrecio(
                                        precioKey
                                      )
                                }
                              >
                                {visible ? (
                                  <EyeOff
                                    size={15}
                                  />
                                ) : (
                                  <Eye
                                    size={15}
                                  />
                                )}
                              </button>

                            </div>
                          </td>


                          <td>
                            <button
                              type="button"
                              className="equipos-units-button"
                              onClick={() =>
                                alternarGrupo(
                                  grupo.id
                                )
                              }
                            >
                              {abierto ? (
                                <ChevronDown
                                  size={15}
                                />
                              ) : (
                                <ChevronRight
                                  size={15}
                                />
                              )}

                              Ver{" "}
                              {
                                grupo
                                  .equipos
                                  .length
                              }
                            </button>
                          </td>

                        </tr>


                        {abierto && (
                          <tr className="equipos-units-row">

                            <td colSpan="10">

                              <div className="equipos-units-list">

                                {grupo.equipos.map(
                                  (
                                    unidad,
                                    indice
                                  ) => {
                                    const unidadVendida =
                                      unidad.estado ===
                                      "vendido";

                                    const puedeGestionarUnidad =
                                      puedeGestionarTienda(
                                        unidad.ubicacionActual
                                      );

                                    return (
                                      <div
                                        className="equipos-unit"
                                        key={
                                          unidad.id
                                        }
                                      >

                                        <span className="equipos-unit-number">
                                          #
                                          {indice +
                                            1}
                                        </span>

                                        <div className="equipos-unit-imei">
                                          <small>
                                            IMEI
                                          </small>

                                          <strong>
                                            {
                                              unidad.imei
                                            }
                                          </strong>
                                        </div>

                                        <span
                                          className={`equipo-status equipo-status--${
                                            unidadVendida
                                              ? "vendido"
                                              : "disponible"
                                          }`}
                                        >
                                          {estadoEquipo(
                                            unidad
                                          )}
                                        </span>

                                        <div className="equipos-actions">

                                          {puedeEditarEquipo &&
                                            puedeGestionarUnidad && (
                                              <button
                                                type="button"
                                                className="icon-action"
                                                title="Editar esta unidad"
                                                disabled={
                                                  eliminandoId === unidad.id
                                                }
                                                onClick={() =>
                                                  abrirEdicion(
                                                    unidad
                                                  )
                                                }
                                              >
                                                <Pencil
                                                  size={15}
                                                />
                                              </button>
                                            )}


                                          {puedeTransferirEquipo &&
                                            puedeGestionarUnidad && (
                                              <button
                                                type="button"
                                                className="icon-action"
                                                title={
                                                  unidadVendida
                                                    ? "El equipo vendido no se puede transferir"
                                                    : "Transferir esta unidad"
                                                }
                                                disabled={
                                                  unidadVendida ||
                                                  eliminandoId === unidad.id
                                                }
                                                onClick={() =>
                                                  abrirTransferencia(
                                                    unidad
                                                  )
                                                }
                                              >
                                                <ArrowRightLeft
                                                  size={15}
                                                />
                                              </button>
                                            )}


                                          {puedeEliminarEquipo &&
                                            puedeGestionarUnidad && (
                                              <button
                                                type="button"
                                                className="icon-action icon-action--danger"
                                                title={
                                                  unidadVendida
                                                    ? "No se puede borrar un equipo vendido"
                                                    : "Eliminar equipo definitivamente"
                                                }
                                                disabled={
                                                  unidadVendida ||
                                                  eliminandoId === unidad.id
                                                }
                                                onClick={() =>
                                                  borrarEquipo(
                                                    unidad
                                                  )
                                                }
                                              >
                                                <Trash2
                                                  size={15}
                                                />
                                              </button>
                                            )}

                                        </div>

                                      </div>
                                    );
                                  }
                                )}

                              </div>

                            </td>

                          </tr>
                        )}

                      </Fragment>
                    );
                  }
                )

              )}

            </tbody>

          </table>

        </div>


        <div className="equipos-table-footer">

          {equiposFiltrados.length}{" "}
          unidad
          {equiposFiltrados.length ===
          1
            ? ""
            : "es"}{" "}
          en{" "}
          {grupos.length}{" "}
          modelo
          {grupos.length === 1
            ? ""
            : "s"}

        </div>

      </div>


      {/* MODAL REGISTRAR / EDITAR */}

      {mostrarFormulario && (

        <div className="equipos-modal-overlay">

          <div className="equipos-modal">

            <div className="equipos-modal__header">

              <div>
                <h2>
                  {equipoEditando
                    ? "Editar unidad"
                    : "Registrar equipos"}
                </h2>

                <p>
                  {equipoEditando
                    ? "Estás editando una unidad individual."
                    : "Indica la cantidad y registra un IMEI por cada unidad."}
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
                <X size={20} />
              </button>

            </div>


            <form
              className="equipo-form"
              onSubmit={
                guardarEquipo
              }
            >

              <div className="equipo-form__grid">


                <label>
                  Tipo *

                  <select
                    name="tipo"
                    value={
                      formulario.tipo
                    }
                    onChange={
                      cambiarCampo
                    }
                  >
                    <option value="celular">
                      Celular
                    </option>

                    <option value="tablet">
                      Tablet
                    </option>

                    <option value="otro">
                      Otro
                    </option>
                  </select>
                </label>


                <label>
                  Cantidad *

                  <input
                    type="number"
                    min="1"
                    max="100"
                    step="1"
                    value={
                      formulario.cantidad
                    }
                    onChange={
                      cambiarCantidad
                    }
                    disabled={
                      Boolean(
                        equipoEditando
                      )
                    }
                    placeholder="1"
                  />

                  {equipoEditando && (
                    <small>
                      La edición es por unidad.
                    </small>
                  )}
                </label>


                <label>
                  Marca *

                  <input
                    name="marca"
                    value={
                      formulario.marca
                    }
                    onChange={
                      cambiarCampo
                    }
                    placeholder="SAMSUNG"
                  />
                </label>


                <label>
                  Modelo *

                  <input
                    name="modelo"
                    value={
                      formulario.modelo
                    }
                    onChange={
                      cambiarCampo
                    }
                    placeholder="Galaxy A56"
                  />
                </label>


                <label>
                  RAM *

                  <div className="equipo-unit-input">

                    <input
                      type="number"
                      min="1"
                      step="1"
                      name="ram"
                      value={
                        formulario.ram
                      }
                      onChange={
                        cambiarCampo
                      }
                      placeholder="8"
                    />

                    <span>
                      GB
                    </span>

                  </div>
                </label>


                <label>
                  Almacenamiento *

                  <div className="equipo-unit-input">

                    <input
                      type="number"
                      min="1"
                      step="1"
                      name="almacenamiento"
                      value={
                        formulario.almacenamiento
                      }
                      onChange={
                        cambiarCampo
                      }
                      placeholder="256"
                    />

                    <span>
                      GB
                    </span>

                  </div>
                </label>


                <label>
                  Color *

                  <input
                    name="color"
                    value={
                      formulario.color
                    }
                    onChange={
                      cambiarCampo
                    }
                    placeholder="Negro"
                  />
                </label>


                <label>
                  Precio venta

                  <div className="equipo-unit-input">

                    <span>
                      S/
                    </span>

                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      name="precioVenta"
                      value={
                        formulario.precioVenta
                      }
                      onChange={
                        cambiarCampo
                      }
                      placeholder="899"
                    />

                  </div>
                </label>


                <label>
                  Precio financiamiento

                  <div className="equipo-unit-input">

                    <span>
                      S/
                    </span>

                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      name="precioFinanciamiento"
                      value={
                        formulario.precioFinanciamiento
                      }
                      onChange={
                        cambiarCampo
                      }
                      placeholder="1150"
                    />

                  </div>
                </label>


                <label>
                  Tienda *

                  <select
                    name="ubicacionActual"
                    value={
                      formulario.ubicacionActual
                    }
                    onChange={
                      cambiarCampo
                    }
                    disabled={
                      Boolean(
                        equipoEditando
                      )
                    }
                  >
                    <option value="">
                      Selecciona una tienda
                    </option>

                    {tiendasGestionables.map(
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

                  {equipoEditando && (
                    <small>
                      Para cambiar de tienda utiliza Transferir.
                    </small>
                  )}
                </label>


                <div className="equipo-form__full equipo-imeis-section">

                  <div className="equipo-imeis-header">

                    <div>
                      <strong>
                        IMEI por unidad *
                      </strong>

                      <span>
                        {
                          formulario
                            .imeis
                            .length
                        }{" "}
                        IMEI
                        {formulario
                          .imeis
                          .length ===
                        1
                          ? ""
                          : "s"}
                      </span>
                    </div>

                  </div>


                  <div className="equipo-imeis-grid">

                    {formulario.imeis.map(
                      (
                        imei,
                        indice
                      ) => (
                        <label
                          key={
                            indice
                          }
                        >
                          IMEI{" "}
                          {indice +
                            1}

                          <input
                            value={
                              imei
                            }
                            onChange={(event) =>
                              cambiarImei(
                                indice,
                                event
                                  .target
                                  .value
                              )
                            }
                            placeholder={`IMEI ${
                              indice +
                              1
                            }`}
                          />
                        </label>
                      )
                    )}

                  </div>

                </div>

              </div>


              {mensajeError && (

                <div className="equipo-form__error">

                  {mensajeError}

                </div>

              )}


              <div className="equipo-form__actions">

                <button
                  type="button"
                  className="equipo-form__cancel"
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
                  className="equipo-form__save"
                  disabled={
                    guardando
                  }
                >
                  {guardando
                    ? "Guardando..."
                    : equipoEditando
                    ? "Guardar cambios"
                    : Number(
                        formulario.cantidad ||
                          1
                      ) > 1
                    ? `Guardar ${formulario.cantidad} equipos`
                    : "Guardar equipo"}
                </button>

              </div>

            </form>

          </div>

        </div>

      )}


      {/* MODAL TRANSFERENCIA */}

      {equipoTransferencia && (

        <div className="equipos-modal-overlay">

          <div className="equipos-modal equipos-modal--small">

            <div className="equipos-modal__header">

              <div>
                <h2>
                  Transferir equipo
                </h2>

                <p>
                  {
                    equipoTransferencia.marca
                  }{" "}
                  {
                    equipoTransferencia.modelo
                  }
                </p>
              </div>

              <button
                type="button"
                onClick={() =>
                  setEquipoTransferencia(
                    null
                  )
                }
                disabled={
                  transfiriendo
                }
              >
                <X size={20} />
              </button>

            </div>


            <form
              className="transfer-form"
              onSubmit={
                confirmarTransferencia
              }
            >

              <div className="transfer-origin">

                <span>
                  Sale de
                </span>

                <strong>
                  {nombreTienda(
                    equipoTransferencia.ubicacionActual
                  )}
                </strong>

              </div>


              <label>
                Tienda destino *

                <select
                  value={
                    destinoId
                  }
                  onChange={(event) =>
                    setDestinoId(
                      event.target.value
                    )
                  }
                >
                  <option value="">
                    Selecciona destino
                  </option>

                  {tiendasActivas
                    .filter(
                      (tienda) =>
                        tienda.id !==
                        equipoTransferencia.ubicacionActual
                    )
                    .map(
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
              </label>


              <label>
                Observación

                <textarea
                  value={
                    observacion
                  }
                  onChange={(event) =>
                    setObservacion(
                      event.target.value
                    )
                  }
                  placeholder="Opcional"
                />
              </label>


              <button
                type="submit"
                className="equipo-form__save"
                disabled={
                  !destinoId ||
                  transfiriendo
                }
              >
                <ArrowRightLeft
                  size={16}
                />

                {transfiriendo
                  ? "Transfiriendo..."
                  : "Confirmar transferencia"}
              </button>

            </form>

          </div>

        </div>

      )}

    </div>
  );
}


export default Equipos;
