import {
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  ArrowUpFromLine,
  CircleDollarSign,
  Pencil,
  Plus,
  Search,
  Trash2,
  X,
} from "lucide-react";

import { useTienda } from "../../context/TiendaContext";
import { useAuth } from "../../context/AuthContext";

import {
  editarRetiro,
  eliminarRetiro,
  registrarRetiro,
  suscribirseRetiros,
} from "../../services/retirosService";

import "./Retiros.css";


const formularioInicial = {
  categoria: "otros",
  descripcion: "",
  monto: "",
  metodoSalida: "efectivo",
};


function Retiros() {
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

  const [retiros, setRetiros] = useState([]);
  const [busqueda, setBusqueda] = useState("");
  const [filtroCategoria, setFiltroCategoria] = useState("todas");

  const [mostrarFormulario, setMostrarFormulario] = useState(false);
  const [retiroEditando, setRetiroEditando] = useState(null);
  const [formulario, setFormulario] = useState(formularioInicial);

  const [guardando, setGuardando] = useState(false);
  const [eliminandoId, setEliminandoId] = useState(null);
  const [error, setError] = useState("");

  const moneda = new Intl.NumberFormat("es-PE", {
    style: "currency",
    currency: "PEN",
  });


  /* =========================================================
     FIREBASE
  ========================================================= */

  useEffect(() => {
    if (!tiendaActiva) {
      setRetiros([]);
      return;
    }

    const cancelar =
      suscribirseRetiros(
        setRetiros,
        tiendaActiva.id,
        esSuperAdmin
      );

    return cancelar;
  }, [
    tiendaActiva?.id,
    esSuperAdmin,
  ]);


  /* =========================================================
     UTILIDADES
  ========================================================= */

  function nombreTienda(id) {
    return (
      tiendas.find((tienda) => tienda.id === id)?.nombre ||
      id?.toUpperCase() ||
      ""
    );
  }

  function fechaRetiro(fecha) {
    if (!fecha) {
      return "-";
    }

    const valor = fecha.toDate ? fecha.toDate() : new Date(fecha);

    return valor.toLocaleString("es-PE", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  function nombreCategoria(categoria) {
    if (categoria === "deposito_banco") return "Depósito a banco";
    if (categoria === "pago_proveedor") return "Pago a proveedor";
    if (categoria === "retiro_personal") return "Retiro personal";
    return "Otros";
  }

  function nombreMetodo(metodo) {
    if (metodo === "transferencia") return "Transferencia";
    if (metodo === "yape") return "Yape";
    if (metodo === "plin") return "Plin";
    return "Efectivo";
  }


  /* =========================================================
     FILTRO
  ========================================================= */

  const retirosMostrados = useMemo(() => {
    const texto = busqueda.trim().toLowerCase();

    return retiros.filter((retiro) => {
      const correspondeTienda =
        tiendaActiva?.id === "todas" ||
        retiro.tiendaId === tiendaActiva?.id;

      if (!correspondeTienda) {
        return false;
      }

      if (
        filtroCategoria !== "todas" &&
        retiro.categoria !== filtroCategoria
      ) {
        return false;
      }

      if (!texto) {
        return true;
      }

      const contenido = [
        retiro.descripcion,
        retiro.categoria,
        retiro.metodoSalida,
        nombreTienda(retiro.tiendaId),
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return contenido.includes(texto);
    });
  }, [
    retiros,
    busqueda,
    filtroCategoria,
    tiendaActiva,
    tiendas,
  ]);


  const totalRetiros = retirosMostrados.reduce(
    (total, retiro) =>
      total + Number(retiro.monto || 0),
    0
  );


  /* =========================================================
     FORMULARIO
  ========================================================= */

  function abrirFormulario() {
    if (!tiendaActiva || tiendaActiva.id === "todas") {
      window.alert("Selecciona primero una tienda específica.");
      return;
    }

    setRetiroEditando(null);
    setFormulario({ ...formularioInicial });
    setError("");
    setMostrarFormulario(true);
  }

  function abrirEdicion(retiro) {
    setRetiroEditando(retiro);

    setFormulario({
      categoria: retiro.categoria || "otros",
      descripcion: retiro.descripcion || "",
      monto: String(retiro.monto ?? ""),
      metodoSalida: retiro.metodoSalida || "efectivo",
    });

    setError("");
    setMostrarFormulario(true);
  }

  function cerrarFormulario() {
    if (guardando) {
      return;
    }

    setMostrarFormulario(false);
    setRetiroEditando(null);
    setFormulario({ ...formularioInicial });
    setError("");
  }

  function cambiarCampo(event) {
    const {
      name,
      value,
    } = event.target;

    setFormulario((anterior) => ({
      ...anterior,
      [name]: value,
    }));
  }


  /* =========================================================
     GUARDAR
  ========================================================= */

  async function guardarRetiro(event) {
    event.preventDefault();
    setError("");

    if (
      !retiroEditando &&
      (!tiendaActiva || tiendaActiva.id === "todas")
    ) {
      setError("Selecciona una tienda.");
      return;
    }

    if (!formulario.descripcion.trim()) {
      setError("Ingresa una descripción.");
      return;
    }

    const montoNumero = Number(formulario.monto);

    if (!Number.isFinite(montoNumero) || montoNumero <= 0) {
      setError("Ingresa un monto válido.");
      return;
    }

    try {
      setGuardando(true);

      if (retiroEditando) {
        await editarRetiro(
          retiroEditando.id,
          {
            categoria: formulario.categoria,
            descripcion: formulario.descripcion,
            monto: montoNumero,
            metodoSalida: formulario.metodoSalida,
          }
        );
      } else {
        await registrarRetiro({
          tiendaId: tiendaActiva.id,
          categoria: formulario.categoria,
          descripcion: formulario.descripcion,
          monto: montoNumero,
          metodoSalida: formulario.metodoSalida,
        });
      }

      setMostrarFormulario(false);
      setRetiroEditando(null);
      setFormulario({ ...formularioInicial });
      setError("");
    } catch (errorGuardado) {
      console.error("Error guardando retiro:", errorGuardado);

      setError(
        errorGuardado.message ||
          "No se pudo guardar el retiro."
      );
    } finally {
      setGuardando(false);
    }
  }


  /* =========================================================
     ELIMINAR
  ========================================================= */

  async function borrarRetiro(retiro) {
    if (!retiro?.id || eliminandoId) {
      return;
    }

    const confirmar = window.confirm(
      `¿Eliminar este retiro definitivamente?

${retiro.descripcion || ""}

${moneda.format(Number(retiro.monto || 0))}

Esta acción no se puede deshacer.`
    );

    if (!confirmar) {
      return;
    }

    try {
      setEliminandoId(retiro.id);

      await eliminarRetiro(retiro.id);
    } catch (errorEliminacion) {
      console.error("Error eliminando retiro:", errorEliminacion);

      window.alert(
        errorEliminacion.message ||
          "No se pudo eliminar el retiro."
      );
    } finally {
      setEliminandoId(null);
    }
  }


  return (
    <div className="retiros-page">

      <div className="retiros-header">

        <div>
          <h1>Retiros</h1>

          <p>
            {tiendaActiva?.id === "todas"
              ? "Retiros registrados en todas las tiendas."
              : `Retiros de ${tiendaActiva?.nombre || ""}.`}
          </p>
        </div>

        <button
          type="button"
          className="retiros-add"
          onClick={abrirFormulario}
        >
          <Plus size={18} />
          Nuevo retiro
        </button>

      </div>


      <section className="retiros-summary">

        <article>
          <div>
            <ArrowUpFromLine size={20} />
          </div>

          <span>Registros mostrados</span>

          <strong>
            {retirosMostrados.length}
          </strong>
        </article>

        <article>
          <div>
            <CircleDollarSign size={20} />
          </div>

          <span>Total retirado</span>

          <strong>
            {moneda.format(totalRetiros)}
          </strong>
        </article>

      </section>


      <div className="retiros-toolbar">

        <div className="retiros-search">
          <Search size={18} />

          <input
            type="text"
            placeholder="Buscar descripción, tienda o método..."
            value={busqueda}
            onChange={(event) =>
              setBusqueda(event.target.value)
            }
          />
        </div>

        <select
          value={filtroCategoria}
          onChange={(event) =>
            setFiltroCategoria(event.target.value)
          }
        >
          <option value="todas">
            Todas las categorías
          </option>

          <option value="deposito_banco">
            Depósito a banco
          </option>

          <option value="pago_proveedor">
            Pago a proveedor
          </option>

          <option value="retiro_personal">
            Retiro personal
          </option>

          <option value="otros">
            Otros
          </option>
        </select>

      </div>


      <div className="retiros-table-card">

        <div className="retiros-table__head">
          <span>Descripción</span>
          <span>Categoría</span>
          <span>Tienda</span>
          <span>Salida</span>
          <span>Fecha</span>
          <span>Monto</span>
          <span>Acciones</span>
        </div>


        {retirosMostrados.length === 0 ? (

          <div className="retiros-empty">

            <ArrowUpFromLine size={36} />

            <strong>
              Sin retiros registrados
            </strong>

            <span>
              Los retiros reales aparecerán aquí.
            </span>

          </div>

        ) : (

          retirosMostrados.map((retiro) => (

            <div
              className="retiros-table__row"
              key={retiro.id}
            >

              <div>
                <strong>
                  {retiro.descripcion}
                </strong>
              </div>


              <span className="retiros-badge">
                {nombreCategoria(retiro.categoria)}
              </span>


              <span>
                {nombreTienda(retiro.tiendaId)}
              </span>


              <span>
                {nombreMetodo(retiro.metodoSalida)}
              </span>


              <span>
                {fechaRetiro(retiro.fecha)}
              </span>


              <strong className="retiros-amount">
                {moneda.format(
                  Number(retiro.monto || 0)
                )}
              </strong>


              <div className="retiros-actions">

                <button
                  type="button"
                  className="retiros-edit-button"
                  title="Editar retiro"
                  disabled={eliminandoId === retiro.id}
                  onClick={() => abrirEdicion(retiro)}
                >
                  <Pencil size={15} />
                </button>


                <button
                  type="button"
                  className="retiros-delete-button"
                  title="Eliminar retiro"
                  disabled={eliminandoId === retiro.id}
                  onClick={() => borrarRetiro(retiro)}
                >
                  <Trash2 size={15} />
                </button>

              </div>

            </div>

          ))

        )}

      </div>


      {mostrarFormulario && (

        <div className="retiros-modal-overlay">

          <div className="retiros-modal">

            <div className="retiros-modal__header">

              <div>
                <h2>
                  {retiroEditando
                    ? "Editar retiro"
                    : "Nuevo retiro"}
                </h2>

                <p>
                  {retiroEditando
                    ? nombreTienda(retiroEditando.tiendaId)
                    : tiendaActiva?.nombre}
                </p>
              </div>


              <button
                type="button"
                onClick={cerrarFormulario}
                disabled={guardando}
              >
                <X size={20} />
              </button>

            </div>


            <form
              className="retiros-form"
              onSubmit={guardarRetiro}
            >

              <label>
                Categoría

                <select
                  name="categoria"
                  value={formulario.categoria}
                  onChange={cambiarCampo}
                >
                  <option value="deposito_banco">
                    Depósito a banco
                  </option>

                  <option value="pago_proveedor">
                    Pago a proveedor
                  </option>

                  <option value="retiro_personal">
                    Retiro personal
                  </option>

                  <option value="otros">
                    Otros
                  </option>
                </select>
              </label>


              <label>
                Descripción *

                <input
                  type="text"
                  name="descripcion"
                  value={formulario.descripcion}
                  onChange={cambiarCampo}
                  placeholder="Motivo del retiro"
                />
              </label>


              <label>
                Monto *

                <div className="retiros-money-input">
                  <span>S/</span>

                  <input
                    type="number"
                    min="0.01"
                    step="0.01"
                    name="monto"
                    value={formulario.monto}
                    onChange={cambiarCampo}
                    placeholder="0.00"
                  />
                </div>
              </label>


              <label>
                Método de salida

                <select
                  name="metodoSalida"
                  value={formulario.metodoSalida}
                  onChange={cambiarCampo}
                >
                  <option value="efectivo">
                    Efectivo
                  </option>

                  <option value="transferencia">
                    Transferencia
                  </option>

                  <option value="yape">
                    Yape
                  </option>

                  <option value="plin">
                    Plin
                  </option>
                </select>
              </label>


              {error && (
                <div className="retiros-form__error">
                  {error}
                </div>
              )}


              <div className="retiros-form__actions">

                <button
                  type="button"
                  className="retiros-cancel"
                  onClick={cerrarFormulario}
                  disabled={guardando}
                >
                  Cancelar
                </button>


                <button
                  type="submit"
                  className="retiros-save"
                  disabled={guardando}
                >
                  {guardando
                    ? "Guardando..."
                    : retiroEditando
                    ? "Guardar cambios"
                    : "Registrar retiro"}
                </button>

              </div>

            </form>

          </div>

        </div>

      )}

    </div>
  );
}


export default Retiros;