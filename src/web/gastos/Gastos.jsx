import {
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  CircleDollarSign,
  Plus,
  ReceiptText,
  Search,
  Store,
  Trash2,
  X,
} from "lucide-react";

import {
  useTienda,
} from "../../context/TiendaContext";

import {
  anularGasto,
  registrarGasto,
  suscribirseGastos,
} from "../../services/gastosService";

import "./Gastos.css";


const formularioVacio = {
  categoria: "",
  descripcion: "",
  monto: "",
};


function Gastos() {
  const {
    tiendaActiva,
    tiendas,
  } = useTienda();


  const [
    gastos,
    setGastos,
  ] = useState([]);


  const [
    busqueda,
    setBusqueda,
  ] = useState("");


  const [
    mostrarFormulario,
    setMostrarFormulario,
  ] = useState(false);


  const [
    formulario,
    setFormulario,
  ] = useState(
    formularioVacio
  );


  const [
    guardando,
    setGuardando,
  ] = useState(false);


  const [
    eliminandoId,
    setEliminandoId,
  ] = useState(null);


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


  /* =====================================================
     LEER FIREBASE
  ===================================================== */

  useEffect(() => {
    const cancelar =
      suscribirseGastos(
        setGastos
      );

    return cancelar;
  }, []);


  /* =====================================================
     FILTRAR GASTOS
  ===================================================== */

  const gastosMostrados =
    useMemo(() => {
      if (!tiendaActiva) {
        return [];
      }


      const texto =
        busqueda
          .trim()
          .toLowerCase();


      return gastos.filter(
        (gasto) => {
          const pertenece =
            tiendaActiva.id ===
              "todas" ||
            gasto.tiendaId ===
              tiendaActiva.id;


          if (!pertenece) {
            return false;
          }


          if (!texto) {
            return true;
          }


          const contenido = [
            gasto.descripcion,
            gasto.categoria,
            gasto.tiendaId,
            gasto.tipoGasto,
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
      gastos,
      tiendaActiva,
      busqueda,
    ]);


  /* =====================================================
     TOTAL REAL
  ===================================================== */

  const totalMostrado =
    useMemo(() => {
      return gastosMostrados.reduce(
        (total, gasto) => {
          return (
            total +
            Number(
              gasto.monto || 0
            )
          );
        },
        0
      );
    }, [
      gastosMostrados,
    ]);


  /* =====================================================
     GASTOS GENERALES
  ===================================================== */

  const gastosGenerales =
    useMemo(() => {
      return gastos.filter(
        (gasto) =>
          gasto.tiendaId ===
            "general" ||
          gasto.tipoGasto ===
            "general"
      );
    }, [
      gastos,
    ]);


  const totalGenerales =
    useMemo(() => {
      return gastosGenerales.reduce(
        (total, gasto) => {
          return (
            total +
            Number(
              gasto.monto || 0
            )
          );
        },
        0
      );
    }, [
      gastosGenerales,
    ]);


  /* =====================================================
     NOMBRE TIENDA
  ===================================================== */

  function nombreTienda(
    tiendaId
  ) {
    if (
      tiendaId === "general"
    ) {
      return "GENERAL";
    }


    const tienda =
      tiendas.find(
        (item) =>
          item.id === tiendaId
      );


    return (
      tienda?.nombre ||
      tiendaId?.toUpperCase() ||
      ""
    );
  }


  /* =====================================================
     FORMATEAR FECHA
  ===================================================== */

  function mostrarFecha(
    fecha
  ) {
    if (!fecha) {
      return "";
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
      return "";
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


  /* =====================================================
     ABRIR FORMULARIO
  ===================================================== */

  function abrirFormulario() {
    setFormulario({
      ...formularioVacio,
    });

    setError("");

    setMostrarFormulario(
      true
    );
  }


  /* =====================================================
     CERRAR FORMULARIO
  ===================================================== */

  function cerrarFormulario() {
    if (guardando) {
      return;
    }


    setMostrarFormulario(
      false
    );

    setFormulario({
      ...formularioVacio,
    });

    setError("");
  }


  /* =====================================================
     CAMBIAR CAMPOS
  ===================================================== */

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


  /* =====================================================
     GUARDAR GASTO
  ===================================================== */

  async function guardarGasto(
    event
  ) {
    event.preventDefault();

    setError("");


    if (!tiendaActiva) {
      setError(
        "No hay una tienda seleccionada."
      );

      return;
    }


    const tiendaId =
      tiendaActiva.id ===
      "todas"
        ? "general"
        : tiendaActiva.id;


    try {
      setGuardando(true);


      await registrarGasto({
        tiendaId,

        categoria:
          formulario.categoria,

        descripcion:
          formulario.descripcion,

        monto:
          formulario.monto,
      });


      setMostrarFormulario(
        false
      );


      setFormulario({
        ...formularioVacio,
      });


      setError("");

    } catch (error) {
      console.error(
        "Error registrando gasto:",
        error
      );


      setError(
        error.message ||
          "No se pudo registrar el gasto."
      );

    } finally {
      setGuardando(false);
    }
  }


  /* =====================================================
     ANULAR GASTO
  ===================================================== */

  async function eliminarGasto(
    gasto
  ) {
    if (!gasto?.id) {
      return;
    }


    const confirmar =
      window.confirm(
        `¿Deseas anular este gasto?

${gasto.descripcion || ""}

${moneda.format(
  Number(gasto.monto || 0)
)}

El registro quedará guardado en el historial como anulado.`
      );


    if (!confirmar) {
      return;
    }


    try {
      setEliminandoId(
        gasto.id
      );


      await anularGasto(
        gasto.id
      );

    } catch (error) {
      console.error(
        "Error anulando gasto:",
        error
      );


      window.alert(
        error.message ||
          "No se pudo anular el gasto."
      );

    } finally {
      setEliminandoId(
        null
      );
    }
  }


  return (
    <div className="gastos-page">

      {/* CABECERA */}

      <div className="gastos-header">

        <div>
          <h1>
            Gastos
          </h1>

          <p>
            {tiendaActiva?.id ===
            "todas"
              ? "Gastos registrados en el sistema."
              : tiendaActiva
              ? `Gastos de ${tiendaActiva.nombre}.`
              : ""}
          </p>
        </div>


        <button
          type="button"
          className="gastos-add"
          onClick={
            abrirFormulario
          }
        >
          <Plus size={18} />

          {tiendaActiva?.id ===
          "todas"
            ? "Nuevo gasto general"
            : "Nuevo gasto"}
        </button>

      </div>


      {/* RESUMEN */}

      <div className="gastos-summary">

        <article>

          <div className="gastos-summary__icon">

            <ReceiptText
              size={21}
            />

          </div>

          <span>
            Registros
          </span>

          <strong>
            {
              gastosMostrados.length
            }
          </strong>

        </article>


        <article>

          <div className="gastos-summary__icon gastos-summary__icon--red">

            <CircleDollarSign
              size={21}
            />

          </div>

          <span>
            Total
          </span>

          <strong>
            {moneda.format(
              totalMostrado
            )}
          </strong>

        </article>


        {tiendaActiva?.id ===
          "todas" && (
          <article>

            <div className="gastos-summary__icon gastos-summary__icon--orange">

              <Store
                size={21}
              />

            </div>

            <span>
              Gastos generales
            </span>

            <strong>
              {moneda.format(
                totalGenerales
              )}
            </strong>

          </article>
        )}

      </div>


      {/* BUSCADOR */}

      <div className="gastos-search">

        <Search
          size={18}
        />

        <input
          type="text"
          placeholder="Buscar"
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


      {/* TABLA */}

      <div className="gastos-table-card">

        <div className="gastos-table__head">

          <span>
            Descripción
          </span>

          <span>
            Categoría
          </span>

          <span>
            Tienda
          </span>

          <span>
            Tipo
          </span>

          <span>
            Fecha
          </span>

          <span>
            Monto
          </span>

          <span>
            Acción
          </span>

        </div>


        {gastosMostrados.length ===
        0 ? (
          <div className="gastos-empty">

            <ReceiptText
              size={36}
            />

            <strong>
              No hay gastos registrados
            </strong>

          </div>
        ) : (
          gastosMostrados.map(
            (gasto) => (
              <div
                className="gastos-table__row"
                key={
                  gasto.id
                }
              >

                <strong className="gasto-description">
                  {
                    gasto.descripcion
                  }
                </strong>


                <span>
                  {
                    gasto.categoria
                  }
                </span>


                <span>
                  {nombreTienda(
                    gasto.tiendaId
                  )}
                </span>


                <span
                  className={
                    gasto.tipoGasto ===
                      "general"
                      ? "gasto-badge gasto-badge--general"
                      : "gasto-badge"
                  }
                >
                  {gasto.tipoGasto ===
                  "general"
                    ? "GENERAL"
                    : "TIENDA"}
                </span>


                <span>
                  {mostrarFecha(
                    gasto.fecha
                  )}
                </span>


                <strong className="gasto-amount">
                  {moneda.format(
                    Number(
                      gasto.monto || 0
                    )
                  )}
                </strong>


                <button
                  type="button"
                  className="gasto-delete-button"
                  title="Anular gasto"
                  disabled={
                    eliminandoId ===
                    gasto.id
                  }
                  onClick={() =>
                    eliminarGasto(
                      gasto
                    )
                  }
                >

                  <Trash2
                    size={16}
                  />

                </button>

              </div>
            )
          )
        )}

      </div>


      {/* MODAL */}

      {mostrarFormulario && (
        <div className="gastos-modal-overlay">

          <div className="gastos-modal">

            <div className="gastos-modal__header">

              <div>

                <h2>
                  {tiendaActiva?.id ===
                  "todas"
                    ? "Registrar gasto general"
                    : "Registrar gasto"}
                </h2>

                <p>
                  {tiendaActiva?.id ===
                  "todas"
                    ? "GENERAL"
                    : tiendaActiva?.nombre ||
                      ""}
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
              className="gastos-form"
              onSubmit={
                guardarGasto
              }
            >

              <label>
                Categoría

                <input
                  type="text"
                  name="categoria"
                  value={
                    formulario.categoria
                  }
                  onChange={
                    cambiarCampo
                  }
                  autoComplete="off"
                />

              </label>


              <label>
                Descripción

                <input
                  type="text"
                  name="descripcion"
                  value={
                    formulario.descripcion
                  }
                  onChange={
                    cambiarCampo
                  }
                  autoComplete="off"
                />

              </label>


              <label>
                Monto

                <div className="gastos-money-input">

                  <span>
                    S/
                  </span>

                  <input
                    type="number"
                    min="0.01"
                    step="0.01"
                    name="monto"
                    value={
                      formulario.monto
                    }
                    onChange={
                      cambiarCampo
                    }
                  />

                </div>

              </label>


              {error && (
                <div className="gastos-form__error">

                  {error}

                </div>
              )}


              <div className="gastos-form__actions">

                <button
                  type="button"
                  className="gastos-cancel"
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
                  className="gastos-save"
                  disabled={
                    guardando
                  }
                >
                  {guardando
                    ? "Guardando..."
                    : "Guardar"}
                </button>

              </div>

            </form>

          </div>

        </div>
      )}

    </div>
  );
}


export default Gastos;