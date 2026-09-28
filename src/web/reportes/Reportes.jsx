import {
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  Boxes,
  CalendarDays,
  CircleDollarSign,
  Download,
  FileBarChart,
  Search,
  TrendingDown,
  TrendingUp,
} from "lucide-react";

import {
  useTienda,
} from "../../context/TiendaContext";

import {
  suscribirseDatosReportes,
} from "../../services/reportesService";

import "./Reportes.css";


function Reportes() {
  const {
    tiendaActiva,
    tiendas,
  } = useTienda();

  const [
    datos,
    setDatos,
  ] = useState({
    ventas: [],
    ingresos: [],
    gastos: [],
    retiros: [],
    equipos: [],
  });

  const [
    fechaDesde,
    setFechaDesde,
  ] = useState("");

  const [
    fechaHasta,
    setFechaHasta,
  ] = useState("");

  const [
    busqueda,
    setBusqueda,
  ] = useState("");

  const [
    filtroTipo,
    setFiltroTipo,
  ] = useState("todos");


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
    const cancelar =
      suscribirseDatosReportes(
        setDatos
      );

    return cancelar;
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
      "SIN TIENDA"
    );
  }


  function obtenerFecha(
    fecha
  ) {
    if (!fecha) {
      return null;
    }

    if (
      typeof fecha.toDate ===
      "function"
    ) {
      return fecha.toDate();
    }

    const convertida =
      new Date(fecha);

    if (
      Number.isNaN(
        convertida.getTime()
      )
    ) {
      return null;
    }

    return convertida;
  }


  function fechaTexto(
    fecha
  ) {
    const valor =
      obtenerFecha(fecha);

    if (!valor) {
      return "-";
    }

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


  function dentroDelRango(
    fecha
  ) {
    if (
      !fechaDesde &&
      !fechaHasta
    ) {
      return true;
    }

    const valor =
      obtenerFecha(fecha);

    if (!valor) {
      return false;
    }

    if (fechaDesde) {
      const inicio =
        new Date(
          `${fechaDesde}T00:00:00`
        );

      if (
        valor < inicio
      ) {
        return false;
      }
    }

    if (fechaHasta) {
      const fin =
        new Date(
          `${fechaHasta}T23:59:59.999`
        );

      if (
        valor > fin
      ) {
        return false;
      }
    }

    return true;
  }


  function correspondeTienda(
    item
  ) {
    return (
      tiendaActiva?.id ===
        "todas" ||
      item.tiendaId ===
        tiendaActiva?.id
    );
  }


  function limpiarFinancieros(
    lista
  ) {
    return lista.filter(
      (item) =>
        item.estado !==
          "anulada" &&
        item.estado !==
          "eliminada"
    );
  }


  function sumar(
    lista
  ) {
    return lista.reduce(
      (total, item) =>
        total +
        Number(
          item.monto || 0
        ),
      0
    );
  }


  function metodoMovimiento(
    item,
    tipo
  ) {
    if (
      tipo === "retiro"
    ) {
      return (
        item.metodoSalida ||
        item.metodoPago ||
        "-"
      );
    }

    return (
      item.metodoPago ||
      item.metodo ||
      "-"
    );
  }


  /* =========================================================
     DATOS FILTRADOS
  ========================================================= */

  const ventasFiltradas =
    useMemo(() => {
      return limpiarFinancieros(
        datos.ventas
      ).filter(
        (venta) =>
          correspondeTienda(
            venta
          ) &&
          dentroDelRango(
            venta.fecha
          )
      );
    }, [
      datos.ventas,
      tiendaActiva,
      fechaDesde,
      fechaHasta,
    ]);


  const ingresosFiltrados =
    useMemo(() => {
      return limpiarFinancieros(
        datos.ingresos
      ).filter(
        (ingreso) =>
          correspondeTienda(
            ingreso
          ) &&
          dentroDelRango(
            ingreso.fecha
          )
      );
    }, [
      datos.ingresos,
      tiendaActiva,
      fechaDesde,
      fechaHasta,
    ]);


  const gastosFiltrados =
    useMemo(() => {
      return limpiarFinancieros(
        datos.gastos
      ).filter(
        (gasto) =>
          correspondeTienda(
            gasto
          ) &&
          dentroDelRango(
            gasto.fecha
          )
      );
    }, [
      datos.gastos,
      tiendaActiva,
      fechaDesde,
      fechaHasta,
    ]);


  const retirosFiltrados =
    useMemo(() => {
      return limpiarFinancieros(
        datos.retiros
      ).filter(
        (retiro) =>
          correspondeTienda(
            retiro
          ) &&
          dentroDelRango(
            retiro.fecha
          )
      );
    }, [
      datos.retiros,
      tiendaActiva,
      fechaDesde,
      fechaHasta,
    ]);


  /* =========================================================
     TOTALES
  ========================================================= */

  const resumen =
    useMemo(() => {
      const ventas =
        sumar(
          ventasFiltradas
        );

      const ingresos =
        sumar(
          ingresosFiltrados
        );

      const gastos =
        sumar(
          gastosFiltrados
        );

      const retiros =
        sumar(
          retirosFiltrados
        );

      return {
        ventas,
        ingresos,
        gastos,
        retiros,

        balance:
          ventas +
          ingresos -
          gastos -
          retiros,
      };
    }, [
      ventasFiltradas,
      ingresosFiltrados,
      gastosFiltrados,
      retirosFiltrados,
    ]);


  /* =========================================================
     INVENTARIO ACTUAL
  ========================================================= */

  const inventario =
    useMemo(() => {
      const lista =
        datos.equipos.filter(
          (equipo) =>
            equipo.activo !==
              false &&
            (
              tiendaActiva?.id ===
                "todas" ||
              equipo.ubicacionActual ===
                tiendaActiva?.id
            )
        );

      const disponibles =
        lista.filter(
          (equipo) =>
            equipo.estado !==
            "vendido"
        );

      const valor =
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
          lista.length,

        disponibles:
          disponibles.length,

        vendidos:
          lista.filter(
            (equipo) =>
              equipo.estado ===
              "vendido"
          ).length,

        valor,
      };
    }, [
      datos.equipos,
      tiendaActiva,
    ]);


  /* =========================================================
     MOVIMIENTOS FINANCIEROS UNIFICADOS
  ========================================================= */

  const movimientos =
    useMemo(() => {
      const lista = [
        ...ventasFiltradas.map(
          (item) => ({
            ...item,

            tipoReporte:
              "venta",

            tipoTexto:
              "Venta",

            signo:
              1,

            metodo:
              metodoMovimiento(
                item,
                "venta"
              ),
          })
        ),

        ...ingresosFiltrados.map(
          (item) => ({
            ...item,

            tipoReporte:
              "ingreso",

            tipoTexto:
              "Ingreso",

            signo:
              1,

            metodo:
              metodoMovimiento(
                item,
                "ingreso"
              ),
          })
        ),

        ...gastosFiltrados.map(
          (item) => ({
            ...item,

            tipoReporte:
              "gasto",

            tipoTexto:
              "Gasto",

            signo:
              -1,

            metodo:
              metodoMovimiento(
                item,
                "gasto"
              ),
          })
        ),

        ...retirosFiltrados.map(
          (item) => ({
            ...item,

            tipoReporte:
              "retiro",

            tipoTexto:
              "Retiro",

            signo:
              -1,

            metodo:
              metodoMovimiento(
                item,
                "retiro"
              ),
          })
        ),
      ];

      const texto =
        busqueda
          .trim()
          .toLowerCase();

      return lista
        .filter(
          (item) => {
            if (
              filtroTipo !==
                "todos" &&
              item.tipoReporte !==
                filtroTipo
            ) {
              return false;
            }

            if (!texto) {
              return true;
            }

            const contenido = [
              item.descripcion,
              item.tipoTexto,
              item.categoria,
              item.metodo,
              nombreTienda(
                item.tiendaId
              ),
            ]
              .filter(Boolean)
              .join(" ")
              .toLowerCase();

            return contenido.includes(
              texto
            );
          }
        )
        .sort(
          (a, b) => {
            const fechaA =
              obtenerFecha(
                a.fecha
              )?.getTime() ||
              0;

            const fechaB =
              obtenerFecha(
                b.fecha
              )?.getTime() ||
              0;

            return (
              fechaB -
              fechaA
            );
          }
        );
    }, [
      ventasFiltradas,
      ingresosFiltrados,
      gastosFiltrados,
      retirosFiltrados,
      busqueda,
      filtroTipo,
      tiendas,
    ]);


  /* =========================================================
     RESUMEN POR TIENDA
  ========================================================= */

  const resumenTiendas =
    useMemo(() => {
      const mapa =
        new Map();

      function asegurar(
        tiendaId
      ) {
        if (
          !mapa.has(
            tiendaId
          )
        ) {
          mapa.set(
            tiendaId,
            {
              tiendaId,

              ventas:
                0,

              ingresos:
                0,

              gastos:
                0,

              retiros:
                0,
            }
          );
        }

        return mapa.get(
          tiendaId
        );
      }


      ventasFiltradas.forEach(
        (item) => {
          asegurar(
            item.tiendaId
          ).ventas +=
            Number(
              item.monto || 0
            );
        }
      );


      ingresosFiltrados.forEach(
        (item) => {
          asegurar(
            item.tiendaId
          ).ingresos +=
            Number(
              item.monto || 0
            );
        }
      );


      gastosFiltrados.forEach(
        (item) => {
          asegurar(
            item.tiendaId
          ).gastos +=
            Number(
              item.monto || 0
            );
        }
      );


      retirosFiltrados.forEach(
        (item) => {
          asegurar(
            item.tiendaId
          ).retiros +=
            Number(
              item.monto || 0
            );
        }
      );


      return Array.from(
        mapa.values()
      )
        .map(
          (item) => ({
            ...item,

            balance:
              item.ventas +
              item.ingresos -
              item.gastos -
              item.retiros,
          })
        )
        .sort(
          (a, b) =>
            nombreTienda(
              a.tiendaId
            ).localeCompare(
              nombreTienda(
                b.tiendaId
              ),
              "es"
            )
        );
    }, [
      ventasFiltradas,
      ingresosFiltrados,
      gastosFiltrados,
      retirosFiltrados,
      tiendas,
    ]);


  /* =========================================================
     EXPORTAR CSV
  ========================================================= */

  function exportarCsv() {
    if (
      movimientos.length ===
      0
    ) {
      window.alert(
        "No hay movimientos para exportar."
      );

      return;
    }

    const escapar =
      (valor) =>
        `"${String(
          valor ?? ""
        ).replaceAll(
          '"',
          '""'
        )}"`;

    const filas = [
      [
        "Fecha",
        "Tipo",
        "Descripción",
        "Tienda",
        "Método",
        "Monto",
      ],

      ...movimientos.map(
        (item) => [
          fechaTexto(
            item.fecha
          ),

          item.tipoTexto,

          item.descripcion ||
            "",

          nombreTienda(
            item.tiendaId
          ),

          item.metodo,

          (
            item.signo *
            Number(
              item.monto || 0
            )
          ).toFixed(2),
        ]
      ),
    ];

    const contenido =
      filas
        .map(
          (fila) =>
            fila
              .map(
                escapar
              )
              .join(",")
        )
        .join("\n");

    const blob =
      new Blob(
        [
          "\uFEFF" +
            contenido,
        ],
        {
          type:
            "text/csv;charset=utf-8;",
        }
      );

    const url =
      URL.createObjectURL(
        blob
      );

    const enlace =
      document.createElement(
        "a"
      );

    enlace.href =
      url;

    enlace.download =
      `reporte-${
        fechaDesde ||
        "inicio"
      }-${
        fechaHasta ||
        "actual"
      }.csv`;

    document.body.appendChild(
      enlace
    );

    enlace.click();

    enlace.remove();

    URL.revokeObjectURL(
      url
    );
  }


  return (
    <div className="reportes-page">

      <div className="reportes-header">

        <div>
          <h1>
            Reportes
          </h1>

          <p>
            {tiendaActiva?.id ===
            "todas"
              ? "Resumen financiero e inventario de todas las tiendas."
              : `Resumen de ${tiendaActiva?.nombre || ""}.`}
          </p>
        </div>


        <button
          type="button"
          className="reportes-export"
          onClick={
            exportarCsv
          }
        >
          <Download
            size={17}
          />

          Exportar CSV
        </button>

      </div>


      <section className="reportes-filters">

        <label>
          <CalendarDays
            size={16}
          />

          Desde

          <input
            type="date"
            value={
              fechaDesde
            }
            onChange={(event) =>
              setFechaDesde(
                event.target.value
              )
            }
          />
        </label>


        <label>
          <CalendarDays
            size={16}
          />

          Hasta

          <input
            type="date"
            value={
              fechaHasta
            }
            onChange={(event) =>
              setFechaHasta(
                event.target.value
              )
            }
          />
        </label>


        <button
          type="button"
          className="reportes-clear"
          onClick={() => {
            setFechaDesde("");
            setFechaHasta("");
          }}
        >
          Todo el historial
        </button>

      </section>


      <section className="reportes-summary">

        <article>
          <TrendingUp
            size={20}
          />

          <span>
            Ventas
          </span>

          <strong>
            {moneda.format(
              resumen.ventas
            )}
          </strong>
        </article>


        <article>
          <CircleDollarSign
            size={20}
          />

          <span>
            Ingresos
          </span>

          <strong>
            {moneda.format(
              resumen.ingresos
            )}
          </strong>
        </article>


        <article>
          <TrendingDown
            size={20}
          />

          <span>
            Gastos
          </span>

          <strong>
            {moneda.format(
              resumen.gastos
            )}
          </strong>
        </article>


        <article>
          <TrendingDown
            size={20}
          />

          <span>
            Retiros
          </span>

          <strong>
            {moneda.format(
              resumen.retiros
            )}
          </strong>
        </article>


        <article className="reportes-summary__balance">
          <FileBarChart
            size={20}
          />

          <span>
            Balance operativo
          </span>

          <strong>
            {moneda.format(
              resumen.balance
            )}
          </strong>
        </article>

      </section>


      <section className="reportes-stock">

        <article>
          <Boxes
            size={20}
          />

          <div>
            <span>
              Equipos disponibles
            </span>

            <strong>
              {
                inventario.disponibles
              }
            </strong>
          </div>
        </article>


        <article>
          <Boxes
            size={20}
          />

          <div>
            <span>
              Equipos vendidos
            </span>

            <strong>
              {
                inventario.vendidos
              }
            </strong>
          </div>
        </article>


        <article>
          <CircleDollarSign
            size={20}
          />

          <div>
            <span>
              Valor del stock disponible
            </span>

            <strong>
              {moneda.format(
                inventario.valor
              )}
            </strong>
          </div>
        </article>

      </section>


      <section className="reportes-panel">

        <div className="reportes-panel__header">

          <div>
            <h2>
              Resumen por tienda
            </h2>

            <p>
              Totales reales del período seleccionado.
            </p>
          </div>

        </div>


        <div className="reportes-table-scroll">

          <table className="reportes-store-table">

            <thead>
              <tr>
                <th>
                  Tienda
                </th>

                <th>
                  Ventas
                </th>

                <th>
                  Ingresos
                </th>

                <th>
                  Gastos
                </th>

                <th>
                  Retiros
                </th>

                <th>
                  Balance
                </th>
              </tr>
            </thead>


            <tbody>

              {resumenTiendas.length ===
              0 ? (

                <tr>
                  <td colSpan="6">
                    <div className="reportes-empty">
                      Sin movimientos financieros en este período.
                    </div>
                  </td>
                </tr>

              ) : (

                resumenTiendas.map(
                  (item) => (
                    <tr
                      key={
                        item.tiendaId
                      }
                    >

                      <td>
                        <strong>
                          {nombreTienda(
                            item.tiendaId
                          )}
                        </strong>
                      </td>

                      <td>
                        {moneda.format(
                          item.ventas
                        )}
                      </td>

                      <td>
                        {moneda.format(
                          item.ingresos
                        )}
                      </td>

                      <td>
                        {moneda.format(
                          item.gastos
                        )}
                      </td>

                      <td>
                        {moneda.format(
                          item.retiros
                        )}
                      </td>

                      <td>
                        <strong>
                          {moneda.format(
                            item.balance
                          )}
                        </strong>
                      </td>

                    </tr>
                  )
                )

              )}

            </tbody>

          </table>

        </div>

      </section>


      <section className="reportes-panel">

        <div className="reportes-panel__header reportes-panel__header--movimientos">

          <div>
            <h2>
              Movimientos financieros
            </h2>

            <p>
              Ventas, ingresos, gastos y retiros.
            </p>
          </div>


          <div className="reportes-movement-filters">

            <div className="reportes-search">

              <Search
                size={17}
              />

              <input
                type="text"
                placeholder="Buscar descripción, tienda o método..."
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
                filtroTipo
              }
              onChange={(event) =>
                setFiltroTipo(
                  event.target.value
                )
              }
            >
              <option value="todos">
                Todos
              </option>

              <option value="venta">
                Ventas
              </option>

              <option value="ingreso">
                Ingresos
              </option>

              <option value="gasto">
                Gastos
              </option>

              <option value="retiro">
                Retiros
              </option>
            </select>

          </div>

        </div>


        <div className="reportes-table-scroll">

          <table className="reportes-movements-table">

            <thead>
              <tr>
                <th>
                  Fecha
                </th>

                <th>
                  Tipo
                </th>

                <th>
                  Descripción
                </th>

                <th>
                  Tienda
                </th>

                <th>
                  Método
                </th>

                <th>
                  Monto
                </th>
              </tr>
            </thead>


            <tbody>

              {movimientos.length ===
              0 ? (

                <tr>
                  <td colSpan="6">
                    <div className="reportes-empty">
                      No hay movimientos que coincidan con los filtros.
                    </div>
                  </td>
                </tr>

              ) : (

                movimientos.map(
                  (item) => (

                    <tr
                      key={`${item.tipoReporte}-${item.id}`}
                    >

                      <td>
                        {fechaTexto(
                          item.fecha
                        )}
                      </td>


                      <td>
                        <span
                          className={`reportes-type reportes-type--${item.tipoReporte}`}
                        >
                          {
                            item.tipoTexto
                          }
                        </span>
                      </td>


                      <td>
                        {item.descripcion ||
                          "-"}
                      </td>


                      <td>
                        {nombreTienda(
                          item.tiendaId
                        )}
                      </td>


                      <td>
                        {
                          item.metodo
                        }
                      </td>


                      <td
                        className={
                          item.signo < 0
                            ? "reportes-amount reportes-amount--negative"
                            : "reportes-amount reportes-amount--positive"
                        }
                      >
                        {item.signo <
                        0
                          ? "-"
                          : "+"}
                        {moneda.format(
                          Number(
                            item.monto ||
                              0
                          )
                        )}
                      </td>

                    </tr>

                  )
                )

              )}

            </tbody>

          </table>

        </div>

      </section>

    </div>
  );
}


export default Reportes;
