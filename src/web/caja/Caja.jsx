import {
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  CheckCircle2,
  CircleDollarSign,
  Pencil,
  Plus,
  Store,
  Trash2,
  TrendingDown,
  TrendingUp,
  WalletCards,
  X,
} from "lucide-react";

import {
  useTienda,
} from "../../context/TiendaContext";

import {
  useAuth,
} from "../../context/AuthContext";

import {
  abrirCaja,
  editarAperturaCaja,
  eliminarAperturaCaja,
  suscribirseEstadoCajas,
} from "../../services/cajaService";

import {
  calcularTotalConteo,
  cerrarCaja,
  crearConteoEfectivoVacio,
} from "../../services/cierresService";

import "./Caja.css";


function Caja() {
  const {
    tiendaActiva,
    tiendas,
  } = useTienda();

  const {
    perfil,
  } = useAuth();

  const esSuperAdmin =
    perfil?.superAdmin ===
    true;

  const [
    cajasAbiertas,
    setCajasAbiertas,
  ] = useState([]);

  const [
    mostrarModalApertura,
    setMostrarModalApertura,
  ] = useState(false);

  const [
    modoApertura,
    setModoApertura,
  ] = useState("crear");

  const [
    cajaInicial,
    setCajaInicial,
  ] = useState("");

  const [
    recargasSaldoInicial,
    setRecargasSaldoInicial,
  ] = useState("");

  const [
    recaudacionSaldoInicial,
    setRecaudacionSaldoInicial,
  ] = useState("");

  const [
    observacionApertura,
    setObservacionApertura,
  ] = useState("");

  const [
    observacionCierre,
    setObservacionCierre,
  ] = useState("");

  const [
    conteoEfectivo,
    setConteoEfectivo,
  ] = useState(
    crearConteoEfectivoVacio()
  );

  const [
    guardando,
    setGuardando,
  ] = useState(false);

  const [
    error,
    setError,
  ] = useState("");


  const moneda =
    new Intl.NumberFormat(
      "es-PE",
      {
        style: "currency",
        currency: "PEN",
      }
    );


  useEffect(() => {
    const cancelar =
      suscribirseEstadoCajas(
        setCajasAbiertas
      );

    return cancelar;
  }, []);


  function nombreTienda(id) {
    return (
      tiendas.find(
        (tienda) =>
          tienda.id === id
      )?.nombre ||
      id?.toUpperCase() ||
      "-"
    );
  }


  function fechaTexto(fecha) {
    if (!fecha) {
      return "-";
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


  const cajaActual =
    useMemo(() => {
      if (
        tiendaActiva?.id ===
        "todas"
      ) {
        return null;
      }

      return (
        cajasAbiertas.find(
          (caja) =>
            caja.tiendaId ===
            tiendaActiva?.id
        ) ||
        null
      );
    }, [
      cajasAbiertas,
      tiendaActiva,
    ]);


  const totalContado =
    useMemo(
      () =>
        calcularTotalConteo(
          conteoEfectivo
        ),
      [
        conteoEfectivo,
      ]
    );


  const diferenciaCierre =
    useMemo(
      () =>
        totalContado -
        Number(
          cajaActual?.cajaEsperada ||
            0
        ),
      [
        totalContado,
        cajaActual,
      ]
    );


  const estadoConteo =
    useMemo(() => {
      const diferencia =
        Number(
          diferenciaCierre || 0
        );

      if (
        Math.abs(
          diferencia
        ) < 0.005
      ) {
        return {
          tipo: "conforme",
          texto: "Caja conforme",
        };
      }

      if (
        diferencia < 0
      ) {
        return {
          tipo: "faltante",
          texto: `Falta ${moneda.format(
            Math.abs(
              diferencia
            )
          )}`,
        };
      }

      return {
        tipo: "sobrante",
        texto: `Sobra ${moneda.format(
          diferencia
        )}`,
      };
    }, [
      diferenciaCierre,
      moneda,
    ]);


  function cambiarCantidad(
    clave,
    valor
  ) {
    const limpio =
      Math.max(
        0,
        Math.trunc(
          Number(
            valor || 0
          )
        )
      );

    setConteoEfectivo(
      (anterior) => ({
        ...anterior,
        [clave]:
          Number.isFinite(
            limpio
          )
            ? limpio
            : 0,
      })
    );
  }


  function subtotal(
    clave,
    valor
  ) {
    return (
      Number(
        conteoEfectivo[
          clave
        ] || 0
      ) * valor
    );
  }


  function inputCantidad(
    clave,
    etiqueta,
    valor
  ) {
    return (
      <div className="caja-mini-denomination">
        <span>
          {etiqueta}
        </span>

        <input
          type="number"
          min="0"
          step="1"
          inputMode="numeric"
          value={
            conteoEfectivo[
              clave
            ] || ""
          }
          onChange={(event) =>
            cambiarCantidad(
              clave,
              event.target.value
            )
          }
          placeholder="0"
        />

        <strong>
          {moneda.format(
            subtotal(
              clave,
              valor
            )
          )}
        </strong>
      </div>
    );
  }


  async function guardarApertura(
    event
  ) {
    event.preventDefault();

    setError("");

    if (!tiendaActiva?.id) {
      setError(
        "No hay una tienda seleccionada. Selecciona una tienda antes de abrir caja."
      );
      return;
    }

    if (
      tiendaActiva.id ===
      "todas"
    ) {
      setError(
        "Selecciona una tienda específica antes de abrir caja."
      );
      return;
    }

    const inicial =
      Number(
        cajaInicial
      );

    if (
      !Number.isFinite(
        inicial
      ) ||
      inicial < 0
    ) {
      setError(
        "Ingresa una caja inicial válida."
      );
      return;
    }

    const inicialRecargas =
      Number(
        recargasSaldoInicial || 0
      );

    const inicialRecaudacion =
      Number(
        recaudacionSaldoInicial || 0
      );

    if (
      !Number.isFinite(
        inicialRecargas
      ) ||
      inicialRecargas < 0 ||
      !Number.isFinite(
        inicialRecaudacion
      ) ||
      inicialRecaudacion < 0
    ) {
      setError(
        "Ingresa saldos iniciales válidos para R. Recargas y Recaudación."
      );
      return;
    }

    try {
      setGuardando(true);

      if (
        modoApertura ===
        "editar"
      ) {
        if (
          !esSuperAdmin
        ) {
          throw new Error(
            "Solo el administrador principal puede editar una apertura."
          );
        }

        if (
          !cajaActual?.id
        ) {
          throw new Error(
            "No se encontró la caja abierta."
          );
        }

        await editarAperturaCaja(
          cajaActual.id,
          {
            cajaInicial:
              inicial,

            recargasSaldoInicial:
              inicialRecargas,

            recaudacionSaldoInicial:
              inicialRecaudacion,

            observacion:
              observacionApertura,
          }
        );
      } else {
        await abrirCaja({
          tiendaId:
            tiendaActiva.id,

          cajaInicial:
            inicial,

          recargasSaldoInicial:
            inicialRecargas,

          recaudacionSaldoInicial:
            inicialRecaudacion,

          observacion:
            observacionApertura,
        });
      }

      setCajaInicial("");
      setRecargasSaldoInicial("");
      setRecaudacionSaldoInicial("");
      setObservacionApertura("");
      setModoApertura(
        "crear"
      );
      setMostrarModalApertura(
        false
      );

      setConteoEfectivo(
        crearConteoEfectivoVacio()
      );
    } catch (
      errorApertura
    ) {
      setError(
        errorApertura.message ||
          "No se pudo guardar la apertura."
      );
    } finally {
      setGuardando(false);
    }
  }


  function abrirEdicionApertura() {
    if (
      !esSuperAdmin ||
      !cajaActual
    ) {
      return;
    }

    setError("");

    setCajaInicial(
      String(
        Number(
          cajaActual.cajaInicial ||
            0
        )
      )
    );

    setRecargasSaldoInicial(
      String(
        Number(
          cajaActual.recargasSaldoInicial ||
            0
        )
      )
    );

    setRecaudacionSaldoInicial(
      String(
        Number(
          cajaActual.recaudacionSaldoInicial ||
            0
        )
      )
    );

    setObservacionApertura(
      cajaActual.observacionApertura ||
        ""
    );

    setModoApertura(
      "editar"
    );

    setMostrarModalApertura(
      true
    );
  }


  async function eliminarAperturaActual() {
    if (
      !esSuperAdmin ||
      !cajaActual?.id
    ) {
      return;
    }

    const confirmar =
      window.confirm(
        `¿Eliminar la apertura de caja de ${nombreTienda(
          cajaActual.tiendaId
        )}?\n\nSolo se podrá eliminar si todavía no existen ventas, ingresos, gastos, retiros o cierres asociados.`
      );

    if (!confirmar) {
      return;
    }

    try {
      setGuardando(
        true
      );
      setError("");

      await eliminarAperturaCaja(
        cajaActual.id
      );

      setConteoEfectivo(
        crearConteoEfectivoVacio()
      );

      window.alert(
        "La apertura fue eliminada correctamente."
      );
    } catch (
      errorEliminar
    ) {
      setError(
        errorEliminar.message ||
          "No se pudo eliminar la apertura."
      );
    } finally {
      setGuardando(
        false
      );
    }
  }


  async function confirmarCierre() {
    setError("");

    if (!tiendaActiva?.id) {
      setError(
        "No hay una tienda seleccionada."
      );
      return;
    }

    if (!cajaActual) {
      setError(
        "No hay una caja abierta para cerrar."
      );
      return;
    }

    const confirmar =
      window.confirm(
        `¿Confirmas el cierre de ${nombreTienda(
          tiendaActiva.id
        )} con un total contado de ${moneda.format(
          totalContado
        )}?`
      );

    if (!confirmar) {
      return;
    }

    try {
      setGuardando(true);

      await cerrarCaja({
        tiendaId:
          tiendaActiva.id,

        conteoEfectivo,

        observacion:
          observacionCierre,
      });

      setConteoEfectivo(
        crearConteoEfectivoVacio()
      );

      setObservacionCierre("");

      window.alert(
        "Caja cerrada correctamente."
      );
    } catch (
      errorCierre
    ) {
      setError(
        errorCierre.message ||
          "No se pudo cerrar la caja."
      );
    } finally {
      setGuardando(false);
    }
  }


  return (
    <div className="caja-page">

      <div className="caja-header">
        <div>
          <h1>
            Caja
          </h1>

          <p>
            Apertura, control y cierre por tienda.
          </p>
        </div>

        {tiendaActiva?.id &&
          tiendaActiva.id !==
          "todas" &&
          !cajaActual && (

            <button
              type="button"
              className="caja-open-button"
              onClick={() => {
                setError("");
                setModoApertura(
                  "crear"
                );
                setCajaInicial("");
                setRecargasSaldoInicial("");
                setRecaudacionSaldoInicial("");
                setObservacionApertura("");
                setMostrarModalApertura(
                  true
                );
              }}
            >
              <Plus size={18} />
              Abrir caja
            </button>
          )}
      </div>


      {!tiendaActiva?.id ? (

        <section className="caja-no-open">
          <Store size={40} />

          <h2>
            Selecciona una tienda
          </h2>

          <p>
            No hay una tienda activa. Selecciona ENTEL, MOVISTAR, MERCEDES, ROPAS o CLARO desde el selector superior.
          </p>
        </section>

      ) : tiendaActiva.id ===
      "todas" ? (

        <section className="caja-panel">
          <div className="caja-panel__header">
            <div>
              <h2>
                Cajas abiertas
              </h2>

              <p>
                Selecciona una tienda para hacer el conteo y cierre.
              </p>
            </div>
          </div>

          <div className="caja-table-scroll">
            <table className="caja-table">
              <thead>
                <tr>
                  <th>Tienda</th>
                  <th>Caja inicial</th>
                  <th>R. Recargas</th>
                  <th>Recaudación</th>
                  <th>Ventas</th>
                  <th>Ingresos</th>
                  <th>Gastos</th>
                  <th>Retiros</th>
                  <th>Caja esperada</th>
                  <th>Apertura</th>
                </tr>
              </thead>

              <tbody>
                {cajasAbiertas.length ===
                0 ? (
                  <tr>
                    <td colSpan="10">
                      <div className="caja-empty">
                        No hay cajas abiertas.
                      </div>
                    </td>
                  </tr>
                ) : (
                  cajasAbiertas.map(
                    (caja) => (
                      <tr key={caja.id}>
                        <td>
                          <strong>
                            {nombreTienda(
                              caja.tiendaId
                            )}
                          </strong>
                        </td>

                        <td>
                          {moneda.format(
                            caja.cajaInicial
                          )}
                        </td>

                        <td>
                          {moneda.format(
                            caja.recargasSaldoActual ||
                              0
                          )}
                        </td>

                        <td>
                          {moneda.format(
                            caja.recaudacionSaldoActual ||
                              0
                          )}
                        </td>

                        <td>
                          {moneda.format(
                            caja.ventas
                          )}
                        </td>

                        <td>
                          {moneda.format(
                            caja.ingresos
                          )}
                        </td>

                        <td>
                          {moneda.format(
                            caja.gastos
                          )}
                        </td>

                        <td>
                          {moneda.format(
                            caja.retiros
                          )}
                        </td>

                        <td>
                          <strong>
                            {moneda.format(
                              caja.cajaEsperada
                            )}
                          </strong>
                        </td>

                        <td>
                          {fechaTexto(
                            caja.fechaApertura
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

      ) : cajaActual ? (

        <>

          <section className="caja-status-card">
            <div>
              <span className="caja-status-badge">
                Caja abierta
              </span>

              <h2>
                {nombreTienda(
                  cajaActual.tiendaId
                )}
              </h2>

              <p>
                Abierta el {fechaTexto(
                  cajaActual.fechaApertura
                )}
              </p>
            </div>

            <div className="caja-status-right">

              <div className="caja-status-total">
                <span>
                  Caja esperada
                </span>

                <strong>
                  {moneda.format(
                    cajaActual.cajaEsperada
                  )}
                </strong>
              </div>


              {esSuperAdmin && (
                <div className="caja-admin-actions">

                  <button
                    type="button"
                    className="caja-admin-edit"
                    onClick={
                      abrirEdicionApertura
                    }
                    disabled={
                      guardando
                    }
                  >
                    <Pencil
                      size={15}
                    />

                    Editar apertura
                  </button>


                  <button
                    type="button"
                    className="caja-admin-delete"
                    onClick={
                      eliminarAperturaActual
                    }
                    disabled={
                      guardando
                    }
                  >
                    <Trash2
                      size={15}
                    />

                    Eliminar apertura
                  </button>

                </div>
              )}

            </div>
          </section>


          <section className="caja-summary">
            <article>
              <WalletCards size={20} />
              <span>Caja inicial</span>
              <strong>
                {moneda.format(
                  cajaActual.cajaInicial
                )}
              </strong>
            </article>

            <article>
              <TrendingUp size={20} />
              <span>Ventas</span>
              <strong>
                {moneda.format(
                  cajaActual.ventas
                )}
              </strong>
            </article>

            <article>
              <CircleDollarSign size={20} />
              <span>Ingresos</span>
              <strong>
                {moneda.format(
                  cajaActual.ingresos
                )}
              </strong>
            </article>

            <article>
              <TrendingDown size={20} />
              <span>Gastos</span>
              <strong>
                {moneda.format(
                  cajaActual.gastos
                )}
              </strong>
            </article>

            <article>
              <TrendingDown size={20} />
              <span>Retiros</span>
              <strong>
                {moneda.format(
                  cajaActual.retiros
                )}
              </strong>
            </article>

            <article className="caja-summary--platform">
              <CircleDollarSign size={20} />
              <span>R. Recargas</span>
              <strong>
                {moneda.format(
                  cajaActual.recargasSaldoActual ||
                    0
                )}
              </strong>
              <small>
                Inicial {moneda.format(
                  cajaActual.recargasSaldoInicial ||
                    0
                )} · Usado {moneda.format(
                  cajaActual.recargasUsado ||
                    0
                )}
              </small>
            </article>

            <article className="caja-summary--platform">
              <CircleDollarSign size={20} />
              <span>Recaudación</span>
              <strong>
                {moneda.format(
                  cajaActual.recaudacionSaldoActual ||
                    0
                )}
              </strong>
              <small>
                Inicial {moneda.format(
                  cajaActual.recaudacionSaldoInicial ||
                    0
                )} · Usado {moneda.format(
                  cajaActual.recaudacionUsado ||
                    0
                )}
              </small>
            </article>
          </section>


          <section className="caja-conteo-card">

            <div className="caja-conteo-header">
              <div>
                <h2>
                  Conteo de efectivo para cierre
                </h2>

                <p>
                  Ingresa cuántos billetes y monedas hay físicamente en esta tienda.
                </p>
              </div>

              <div className="caja-conteo-totals">
                <div>
                  <span>Contado</span>
                  <strong>
                    {moneda.format(
                      totalContado
                    )}
                  </strong>
                </div>

                <div>
                  <span>Diferencia</span>
                  <strong
                    className={
                      diferenciaCierre < 0
                        ? "caja-negative"
                        : diferenciaCierre > 0
                        ? "caja-positive"
                        : ""
                    }
                  >
                    {moneda.format(
                      diferenciaCierre
                    )}
                  </strong>
                </div>
              </div>
            </div>


            <div
              className={`caja-cierre-status caja-cierre-status--${estadoConteo.tipo}`}
            >
              <strong>
                {estadoConteo.texto}
              </strong>

              <span>
                {estadoConteo.tipo === "conforme"
                  ? "El efectivo contado coincide con la caja esperada."
                  : estadoConteo.tipo === "faltante"
                  ? "El efectivo contado es menor que la caja esperada."
                  : "El efectivo contado es mayor que la caja esperada."}
              </span>
            </div>


            <div className="caja-conteo-columns">

              <div className="caja-conteo-block">
                <h3>
                  Billetes
                </h3>

                <div className="caja-count-grid">
                  {inputCantidad(
                    "b200",
                    "S/ 200",
                    200
                  )}

                  {inputCantidad(
                    "b100",
                    "S/ 100",
                    100
                  )}

                  {inputCantidad(
                    "b50",
                    "S/ 50",
                    50
                  )}

                  {inputCantidad(
                    "b20",
                    "S/ 20",
                    20
                  )}

                  {inputCantidad(
                    "b10",
                    "S/ 10",
                    10
                  )}
                </div>
              </div>


              <div className="caja-conteo-block">
                <h3>
                  Monedas
                </h3>

                <div className="caja-count-grid caja-count-grid--coins">
                  {inputCantidad(
                    "m5",
                    "S/ 5",
                    5
                  )}

                  {inputCantidad(
                    "m2",
                    "S/ 2",
                    2
                  )}

                  <div className="caja-grouped-box">
                    <span className="caja-grouped-title">
                      S/ 1 y 50 céntimos
                    </span>

                    <div className="caja-grouped-inputs">
                      {inputCantidad(
                        "m1",
                        "S/ 1",
                        1
                      )}

                      {inputCantidad(
                        "c50",
                        "50 cént.",
                        0.5
                      )}
                    </div>
                  </div>

                  <div className="caja-grouped-box">
                    <span className="caja-grouped-title">
                      Céntimos
                    </span>

                    <div className="caja-grouped-inputs">
                      {inputCantidad(
                        "c20",
                        "20 cént.",
                        0.2
                      )}

                      {inputCantidad(
                        "c10",
                        "10 cént.",
                        0.1
                      )}
                    </div>
                  </div>
                </div>
              </div>

            </div>


            <label className="caja-conteo-observacion">
              Observación del cierre

              <textarea
                rows="3"
                value={
                  observacionCierre
                }
                onChange={(event) =>
                  setObservacionCierre(
                    event.target.value
                  )
                }
                placeholder="Opcional: faltante, sobrante, incidencia..."
              />
            </label>


            {error && (
              <div className="caja-error">
                {error}
              </div>
            )}


            <div className="caja-conteo-actions">
              <button
                type="button"
                className="caja-reset-button"
                onClick={() =>
                  setConteoEfectivo(
                    crearConteoEfectivoVacio()
                  )
                }
                disabled={
                  guardando
                }
              >
                Limpiar conteo
              </button>

              <button
                type="button"
                className="caja-close-button"
                onClick={
                  confirmarCierre
                }
                disabled={
                  guardando
                }
              >
                <CheckCircle2 size={18} />

                {guardando
                  ? "Cerrando..."
                  : "Confirmar cierre"}
              </button>
            </div>

          </section>


          <div className="caja-formula">
            <strong>
              Fórmula:
            </strong>

            Caja inicial + Ventas en efectivo + Ingresos en efectivo - Gastos en efectivo - Retiros en efectivo = Caja esperada
          </div>

        </>

      ) : (

        <section className="caja-no-open">
          <Store size={40} />

          <h2>
            No hay caja abierta
          </h2>

          <p>
            Abre una caja para comenzar a registrar operaciones en esta tienda.
          </p>

          <button
            type="button"
            className="caja-open-button"
            onClick={() => {
              setError("");
              setModoApertura(
                "crear"
              );
              setCajaInicial("");
              setObservacionApertura("");
              setMostrarModalApertura(
                true
              );
            }}
          >
            <Plus size={18} />
            Abrir caja
          </button>
        </section>

      )}


      {mostrarModalApertura &&
        tiendaActiva?.id &&
        tiendaActiva.id !== "todas" && (
        <div className="caja-modal-overlay">
          <div className="caja-modal">

            <div className="caja-modal__header">
              <div>
                <h2>
                  {modoApertura ===
                  "editar"
                    ? "Editar apertura"
                    : "Abrir caja"}
                </h2>

                <p>
                  {nombreTienda(
                    tiendaActiva?.id
                  )}
                </p>
              </div>

              <button
                type="button"
                onClick={() => {
                  setMostrarModalApertura(
                    false
                  );
                  setModoApertura(
                    "crear"
                  );
                }}
                disabled={
                  guardando
                }
              >
                <X size={20} />
              </button>
            </div>


            <form
              className="caja-form"
              onSubmit={
                guardarApertura
              }
            >

              <label>
                Caja inicial *

                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={
                    cajaInicial
                  }
                  onChange={(event) =>
                    setCajaInicial(
                      event.target.value
                    )
                  }
                  placeholder="0.00"
                />
              </label>


              <div className="caja-platform-opening-grid">
                <label>
                  Saldo inicial R. Recargas *

                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={
                      recargasSaldoInicial
                    }
                    onChange={(event) =>
                      setRecargasSaldoInicial(
                        event.target.value
                      )
                    }
                    placeholder="0.00"
                  />
                </label>

                <label>
                  Saldo inicial Recaudación *

                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={
                      recaudacionSaldoInicial
                    }
                    onChange={(event) =>
                      setRecaudacionSaldoInicial(
                        event.target.value
                      )
                    }
                    placeholder="0.00"
                  />
                </label>
              </div>


              <label>
                Observación

                <textarea
                  value={
                    observacionApertura
                  }
                  onChange={(event) =>
                    setObservacionApertura(
                      event.target.value
                    )
                  }
                  rows="3"
                  placeholder="Opcional"
                />
              </label>


              {error && (
                <div className="caja-error">
                  {error}
                </div>
              )}


              <div className="caja-form__actions">
                <button
                  type="button"
                  className="caja-cancel"
                  onClick={() => {
                    setMostrarModalApertura(
                      false
                    );
                    setModoApertura(
                      "crear"
                    );
                  }}
                  disabled={
                    guardando
                  }
                >
                  Cancelar
                </button>

                <button
                  type="submit"
                  className="caja-save"
                  disabled={
                    guardando
                  }
                >
                  {guardando
                    ? "Guardando..."
                    : modoApertura ===
                      "editar"
                    ? "Guardar cambios"
                    : "Abrir caja"}
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

    </div>
  );
}


export default Caja;
