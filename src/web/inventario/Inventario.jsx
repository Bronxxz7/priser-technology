import {
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  ArrowRightLeft,
  Boxes,
  CircleDollarSign,
  PackageOpen,
  Search,
  Smartphone,
  Tablet,
} from "lucide-react";

import {
  useTienda,
} from "../../context/TiendaContext";

import {
  suscribirseInventario,
  suscribirseMovimientosInventario,
} from "../../services/inventarioService";

import "./Inventario.css";


function Inventario() {
  const {
    tiendaActiva,
    tiendas,
  } = useTienda();

  const [
    equipos,
    setEquipos,
  ] = useState([]);

  const [
    movimientos,
    setMovimientos,
  ] = useState([]);

  const [
    busqueda,
    setBusqueda,
  ] = useState("");

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


  const moneda =
    new Intl.NumberFormat(
      "es-PE",
      {
        style:
          "currency",

        currency:
          "PEN",
      }
    );


  /* =========================================================
     FIREBASE
  ========================================================= */

  useEffect(() => {
    const cancelarEquipos =
      suscribirseInventario(
        setEquipos
      );

    const cancelarMovimientos =
      suscribirseMovimientosInventario(
        setMovimientos
      );

    return () => {
      cancelarEquipos?.();
      cancelarMovimientos?.();
    };
  }, []);


  /* =========================================================
     UTILIDADES
  ========================================================= */

  function nombreTienda(
    id
  ) {
    return (
      tiendas.find(
        (tienda) =>
          tienda.id === id
      )?.nombre ||
      id?.toUpperCase() ||
      "SIN UBICACIÓN"
    );
  }


  function nombreTipo(
    tipo
  ) {
    const valor =
      String(
        tipo ||
          "celular"
      ).toLowerCase();

    if (
      valor ===
      "tablet"
    ) {
      return "Tablet";
    }

    if (
      valor ===
      "otro"
    ) {
      return "Otro";
    }

    return "Celular";
  }


  function valorGb(
    valor
  ) {
    if (
      valor === null ||
      valor === undefined ||
      valor === ""
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


  function fechaMovimiento(
    fecha
  ) {
    if (!fecha) {
      return "-";
    }

    const valor =
      fecha.toDate
        ? fecha.toDate()
        : new Date(fecha);

    return valor.toLocaleString(
      "es-PE",
      {
        day:
          "2-digit",

        month:
          "2-digit",

        year:
          "numeric",

        hour:
          "2-digit",

        minute:
          "2-digit",
      }
    );
  }


  function nombreMovimiento(
    tipo
  ) {
    if (
      tipo ===
      "transferencia"
    ) {
      return "Transferencia";
    }

    if (
      tipo ===
      "venta"
    ) {
      return "Venta";
    }

    if (
      tipo ===
      "ingreso_inicial"
    ) {
      return "Ingreso inicial";
    }

    if (
      tipo ===
      "anulacion_venta"
    ) {
      return "Anulación de venta";
    }

    return (
      String(tipo || "Movimiento")
        .replaceAll(
          "_",
          " "
        )
    );
  }


  /* =========================================================
     EQUIPOS DE LA TIENDA
  ========================================================= */

  const equiposDeTienda =
    useMemo(() => {
      return equipos.filter(
        (equipo) =>
          tiendaActiva?.id ===
            "todas" ||
          equipo.ubicacionActual ===
            tiendaActiva?.id
      );
    }, [
      equipos,
      tiendaActiva,
    ]);


  /* =========================================================
     RESUMEN
  ========================================================= */

  const resumen =
    useMemo(() => {
      const disponibles =
        equiposDeTienda.filter(
          (equipo) =>
            equipo.estado !==
            "vendido"
        );

      const vendidos =
        equiposDeTienda.filter(
          (equipo) =>
            equipo.estado ===
            "vendido"
        );

      const celulares =
        disponibles.filter(
          (equipo) =>
            String(
              equipo.tipo ||
                "celular"
            ).toLowerCase() ===
            "celular"
        );

      const tablets =
        disponibles.filter(
          (equipo) =>
            String(
              equipo.tipo ||
                ""
            ).toLowerCase() ===
            "tablet"
        );

      const valorStock =
        disponibles.reduce(
          (
            total,
            equipo
          ) =>
            total +
            Number(
              equipo.precioVenta ||
                0
            ),
          0
        );

      return {
        total:
          equiposDeTienda.length,

        disponibles:
          disponibles.length,

        vendidos:
          vendidos.length,

        celulares:
          celulares.length,

        tablets:
          tablets.length,

        valorStock,
      };
    }, [
      equiposDeTienda,
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
            .filter(
              Boolean
            )
        ),
      ].sort(
        (a, b) =>
          a.localeCompare(
            b,
            "es"
          )
      );
    }, [
      equiposDeTienda,
    ]);


  /* =========================================================
     FILTRO
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
              equipo.marca ||
                ""
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
            .filter(Boolean)
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
     AGRUPAR STOCK POR MODELO
  ========================================================= */

  const grupos =
    useMemo(() => {
      const mapa =
        new Map();

      equiposFiltrados.forEach(
        (equipo) => {
          const clave = [
            String(
              equipo.marca ||
                ""
            ).toUpperCase(),

            String(
              equipo.modelo ||
                ""
            ).toUpperCase(),

            String(
              equipo.tipo ||
                "celular"
            ).toLowerCase(),

            String(
              equipo.ram ||
                ""
            ),

            String(
              equipo.almacenamiento ||
                ""
            ),

            String(
              equipo.color ||
                ""
            ).toUpperCase(),

            String(
              equipo.ubicacionActual ||
                ""
            ),

            Number(
              equipo.precioVenta ||
                0
            ),
          ].join("|");

          if (
            !mapa.has(clave)
          ) {
            mapa.set(
              clave,
              {
                id:
                  clave,

                muestra:
                  equipo,

                disponibles:
                  0,

                vendidos:
                  0,

                total:
                  0,

                valorDisponible:
                  0,
              }
            );
          }

          const grupo =
            mapa.get(clave);

          grupo.total +=
            1;

          if (
            equipo.estado ===
            "vendido"
          ) {
            grupo.vendidos +=
              1;
          } else {
            grupo.disponibles +=
              1;

            grupo.valorDisponible +=
              Number(
                equipo.precioVenta ||
                  0
              );
          }
        }
      );

      return Array.from(
        mapa.values()
      );
    }, [
      equiposFiltrados,
    ]);


  /* =========================================================
     MOVIMIENTOS DE LA TIENDA
  ========================================================= */

  const movimientosMostrados =
    useMemo(() => {
      return movimientos
        .filter(
          (movimiento) => {
            if (
              tiendaActiva?.id ===
              "todas"
            ) {
              return true;
            }

            return (
              movimiento.origenTiendaId ===
                tiendaActiva?.id ||
              movimiento.destinoTiendaId ===
                tiendaActiva?.id
            );
          }
        )
        .slice(
          0,
          12
        );
    }, [
      movimientos,
      tiendaActiva,
    ]);


  return (
    <div className="inventario-page">

      <div className="inventario-header">

        <div>
          <h1>
            Inventario
          </h1>

          <p>
            {tiendaActiva?.id ===
            "todas"
              ? "Resumen real del inventario de todas las tiendas."
              : `Inventario de ${tiendaActiva?.nombre || ""}.`}
          </p>
        </div>

      </div>


      <section className="inventario-summary">

        <article>
          <Boxes size={20} />

          <span>
            Disponibles
          </span>

          <strong>
            {
              resumen.disponibles
            }
          </strong>
        </article>


        <article>
          <Smartphone
            size={20}
          />

          <span>
            Celulares
          </span>

          <strong>
            {
              resumen.celulares
            }
          </strong>
        </article>


        <article>
          <Tablet size={20} />

          <span>
            Tablets
          </span>

          <strong>
            {
              resumen.tablets
            }
          </strong>
        </article>


        <article>
          <PackageOpen
            size={20}
          />

          <span>
            Vendidos
          </span>

          <strong>
            {
              resumen.vendidos
            }
          </strong>
        </article>


        <article>
          <CircleDollarSign
            size={20}
          />

          <span>
            Valor disponible
          </span>

          <strong>
            {moneda.format(
              resumen.valorStock
            )}
          </strong>
        </article>

      </section>


      <div className="inventario-toolbar">

        <div className="inventario-search">

          <Search size={18} />

          <input
            type="text"
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
                value={marca}
                key={marca}
              >
                {marca}
              </option>
            )
          )}
        </select>

      </div>


      <section className="inventario-panel">

        <div className="inventario-panel__header">

          <div>
            <h2>
              Stock por modelo
            </h2>

            <p>
              Agrupado automáticamente desde los equipos reales.
            </p>
          </div>

          <strong>
            {equiposFiltrados.length}{" "}
            unidad
            {equiposFiltrados.length ===
            1
              ? ""
              : "es"}
          </strong>

        </div>


        <div className="inventario-table-scroll">

          <table className="inventario-table">

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
                  Disponibles
                </th>

                <th>
                  Vendidos
                </th>

                <th>
                  Total
                </th>

                <th>
                  Precio unit.
                </th>

                <th>
                  Valor disponible
                </th>
              </tr>
            </thead>


            <tbody>

              {grupos.length ===
              0 ? (

                <tr>
                  <td colSpan="10">

                    <div className="inventario-empty">

                      <Boxes
                        size={34}
                      />

                      <strong>
                        Sin inventario
                      </strong>

                      <span>
                        Los equipos reales aparecerán aquí.
                      </span>

                    </div>

                  </td>
                </tr>

              ) : (

                grupos.map(
                  (grupo) => {
                    const equipo =
                      grupo.muestra;

                    return (
                      <tr
                        key={
                          grupo.id
                        }
                      >

                        <td>
                          <div className="inventario-equipo">

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
                                {
                                  equipo.marca
                                }{" "}
                                {
                                  equipo.modelo
                                }
                              </strong>

                              <small>
                                {
                                  equipo.color ||
                                  "-"
                                }
                              </small>
                            </div>

                          </div>
                        </td>


                        <td>
                          {nombreTipo(
                            equipo.tipo
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
                          <strong className="inventario-number inventario-number--available">
                            {
                              grupo.disponibles
                            }
                          </strong>
                        </td>


                        <td>
                          <strong className="inventario-number">
                            {
                              grupo.vendidos
                            }
                          </strong>
                        </td>


                        <td>
                          <strong className="inventario-number">
                            {
                              grupo.total
                            }
                          </strong>
                        </td>


                        <td>
                          {moneda.format(
                            Number(
                              equipo.precioVenta ||
                                0
                            )
                          )}
                        </td>


                        <td>
                          <strong>
                            {moneda.format(
                              grupo.valorDisponible
                            )}
                          </strong>
                        </td>

                      </tr>
                    );
                  }
                )

              )}

            </tbody>

          </table>

        </div>

      </section>


      <section className="inventario-panel">

        <div className="inventario-panel__header">

          <div>
            <h2>
              Últimos movimientos
            </h2>

            <p>
              Ingresos, ventas y transferencias registradas en Firestore.
            </p>
          </div>

          <ArrowRightLeft
            size={20}
          />

        </div>


        <div className="inventario-movimientos">

          {movimientosMostrados.length ===
          0 ? (

            <div className="inventario-empty inventario-empty--small">

              <ArrowRightLeft
                size={30}
              />

              <strong>
                Sin movimientos
              </strong>

              <span>
                Los movimientos reales aparecerán aquí.
              </span>

            </div>

          ) : (

            movimientosMostrados.map(
              (movimiento) => (

                <div
                  className="inventario-movimiento"
                  key={
                    movimiento.id
                  }
                >

                  <div>
                    <strong>
                      {nombreMovimiento(
                        movimiento.tipo
                      )}
                    </strong>

                    <span>
                      {movimiento.observacion ||
                        "Sin observación"}
                    </span>
                  </div>


                  <div className="inventario-movimiento__ruta">

                    <span>
                      {movimiento.origenTiendaId
                        ? nombreTienda(
                            movimiento.origenTiendaId
                          )
                        : "Ingreso"}
                    </span>

                    <ArrowRightLeft
                      size={14}
                    />

                    <span>
                      {movimiento.destinoTiendaId ===
                      "cliente"
                        ? "CLIENTE"
                        : nombreTienda(
                            movimiento.destinoTiendaId
                          )}
                    </span>

                  </div>


                  <time>
                    {fechaMovimiento(
                      movimiento.fecha
                    )}
                  </time>

                </div>

              )
            )

          )}

        </div>

      </section>

    </div>
  );
}


export default Inventario;
