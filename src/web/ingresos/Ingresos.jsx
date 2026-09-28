import {
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  CircleDollarSign,
  Pencil,
  Plus,
  Search,
  Trash2,
  WalletCards,
  X,
} from "lucide-react";

import { useTienda } from "../../context/TiendaContext";

import {
  editarIngreso,
  eliminarIngreso,
  registrarIngreso,
  suscribirseIngresos,
} from "../../services/ingresosService";

import "./Ingresos.css";

const formularioInicial = {
  categoria: "otros",
  descripcion: "",
  monto: "",
  metodoPago: "efectivo",
};

function Ingresos() {
  const { tiendaActiva, tiendas } = useTienda();

  const [ingresos, setIngresos] = useState([]);
  const [busqueda, setBusqueda] = useState("");
  const [filtroCategoria, setFiltroCategoria] = useState("todas");

  const [mostrarFormulario, setMostrarFormulario] = useState(false);
  const [ingresoEditando, setIngresoEditando] = useState(null);
  const [formulario, setFormulario] = useState(formularioInicial);

  const [guardando, setGuardando] = useState(false);
  const [eliminandoId, setEliminandoId] = useState(null);
  const [error, setError] = useState("");

  const moneda = new Intl.NumberFormat("es-PE", {
    style: "currency",
    currency: "PEN",
  });

  useEffect(() => {
    const cancelar = suscribirseIngresos(setIngresos);
    return cancelar;
  }, []);

  function nombreTienda(id) {
    return (
      tiendas.find((tienda) => tienda.id === id)?.nombre ||
      id?.toUpperCase() ||
      ""
    );
  }

  function fechaIngreso(fecha) {
    if (!fecha) return "-";

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
    if (categoria === "abono") return "Abono";
    if (categoria === "ajuste") return "Ajuste";
    if (categoria === "devolucion") return "Devolución";
    return "Otros";
  }

  const ingresosMostrados = useMemo(() => {
    const texto = busqueda.trim().toLowerCase();

    return ingresos.filter((ingreso) => {
      const correspondeTienda =
        tiendaActiva?.id === "todas" ||
        ingreso.tiendaId === tiendaActiva?.id;

      if (!correspondeTienda) return false;

      if (
        filtroCategoria !== "todas" &&
        ingreso.categoria !== filtroCategoria
      ) {
        return false;
      }

      if (!texto) return true;

      const contenido = [
        ingreso.descripcion,
        ingreso.categoria,
        ingreso.metodoPago,
        nombreTienda(ingreso.tiendaId),
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return contenido.includes(texto);
    });
  }, [
    ingresos,
    busqueda,
    filtroCategoria,
    tiendaActiva,
    tiendas,
  ]);

  const totalIngresos = ingresosMostrados.reduce(
    (total, ingreso) => total + Number(ingreso.monto || 0),
    0
  );

  function abrirFormulario() {
    if (!tiendaActiva || tiendaActiva.id === "todas") {
      window.alert("Selecciona primero una tienda específica.");
      return;
    }

    setIngresoEditando(null);
    setFormulario({ ...formularioInicial });
    setError("");
    setMostrarFormulario(true);
  }

  function abrirEdicion(ingreso) {
    setIngresoEditando(ingreso);

    setFormulario({
      categoria: ingreso.categoria || "otros",
      descripcion: ingreso.descripcion || "",
      monto: String(ingreso.monto ?? ""),
      metodoPago: ingreso.metodoPago || "efectivo",
    });

    setError("");
    setMostrarFormulario(true);
  }

  function cerrarFormulario() {
    if (guardando) return;

    setMostrarFormulario(false);
    setIngresoEditando(null);
    setFormulario({ ...formularioInicial });
    setError("");
  }

  function cambiarCampo(event) {
    const { name, value } = event.target;

    setFormulario((anterior) => ({
      ...anterior,
      [name]: value,
    }));
  }

  async function guardarIngreso(event) {
    event.preventDefault();
    setError("");

    if (
      !ingresoEditando &&
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

      if (ingresoEditando) {
        await editarIngreso(ingresoEditando.id, {
          categoria: formulario.categoria,
          descripcion: formulario.descripcion,
          monto: montoNumero,
          metodoPago: formulario.metodoPago,
        });
      } else {
        await registrarIngreso({
          tiendaId: tiendaActiva.id,
          categoria: formulario.categoria,
          descripcion: formulario.descripcion,
          monto: montoNumero,
          metodoPago: formulario.metodoPago,
        });
      }

      setMostrarFormulario(false);
      setIngresoEditando(null);
      setFormulario({ ...formularioInicial });
      setError("");
    } catch (errorGuardado) {
      console.error("Error guardando ingreso:", errorGuardado);

      setError(
        errorGuardado.message ||
          "No se pudo guardar el ingreso."
      );
    } finally {
      setGuardando(false);
    }
  }

  async function borrarIngreso(ingreso) {
    if (!ingreso?.id || eliminandoId) return;

    const confirmar = window.confirm(
      `¿Eliminar este ingreso definitivamente?

${ingreso.descripcion || ""}

${moneda.format(Number(ingreso.monto || 0))}

Esta acción no se puede deshacer.`
    );

    if (!confirmar) return;

    try {
      setEliminandoId(ingreso.id);
      await eliminarIngreso(ingreso.id);
    } catch (errorEliminacion) {
      console.error("Error eliminando ingreso:", errorEliminacion);

      window.alert(
        errorEliminacion.message ||
          "No se pudo eliminar el ingreso."
      );
    } finally {
      setEliminandoId(null);
    }
  }

  return (
    <div className="ingresos-page">
      <div className="ingresos-header">
        <div>
          <h1>Ingresos</h1>

          <p>
            {tiendaActiva?.id === "todas"
              ? "Ingresos registrados en todas las tiendas."
              : `Ingresos de ${tiendaActiva?.nombre || ""}.`}
          </p>
        </div>

        <button
          type="button"
          className="ingresos-add"
          onClick={abrirFormulario}
        >
          <Plus size={18} />
          Nuevo ingreso
        </button>
      </div>

      <section className="ingresos-summary">
        <article>
          <div>
            <WalletCards size={20} />
          </div>

          <span>Registros mostrados</span>
          <strong>{ingresosMostrados.length}</strong>
        </article>

        <article>
          <div>
            <CircleDollarSign size={20} />
          </div>

          <span>Total de ingresos</span>
          <strong>{moneda.format(totalIngresos)}</strong>
        </article>
      </section>

      <div className="ingresos-toolbar">
        <div className="ingresos-search">
          <Search size={18} />

          <input
            type="text"
            placeholder="Buscar descripción, tienda o método de pago..."
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
          <option value="todas">Todas las categorías</option>
          <option value="abono">Abonos</option>
          <option value="ajuste">Ajustes</option>
          <option value="devolucion">Devoluciones</option>
          <option value="otros">Otros</option>
        </select>
      </div>

      <div className="ingresos-table-card">
        <div className="ingresos-table__head">
          <span>Descripción</span>
          <span>Categoría</span>
          <span>Tienda</span>
          <span>Pago</span>
          <span>Fecha</span>
          <span>Monto</span>
          <span>Acciones</span>
        </div>

        {ingresosMostrados.length === 0 ? (
          <div className="ingresos-empty">
            <WalletCards size={36} />

            <strong>Sin ingresos registrados</strong>

            <span>
              Los ingresos reales aparecerán aquí.
            </span>
          </div>
        ) : (
          ingresosMostrados.map((ingreso) => (
            <div
              className="ingresos-table__row"
              key={ingreso.id}
            >
              <div>
                <strong>{ingreso.descripcion}</strong>
              </div>

              <span className="ingresos-badge">
                {nombreCategoria(ingreso.categoria)}
              </span>

              <span>
                {nombreTienda(ingreso.tiendaId)}
              </span>

              <span>
                {ingreso.metodoPago}
              </span>

              <span>
                {fechaIngreso(ingreso.fecha)}
              </span>

              <strong className="ingresos-amount">
                {moneda.format(Number(ingreso.monto || 0))}
              </strong>

              <div className="ingresos-actions">
                <button
                  type="button"
                  className="ingresos-edit-button"
                  title="Editar ingreso"
                  disabled={eliminandoId === ingreso.id}
                  onClick={() => abrirEdicion(ingreso)}
                >
                  <Pencil size={15} />
                </button>

                <button
                  type="button"
                  className="ingresos-delete-button"
                  title="Eliminar ingreso"
                  disabled={eliminandoId === ingreso.id}
                  onClick={() => borrarIngreso(ingreso)}
                >
                  <Trash2 size={15} />
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {mostrarFormulario && (
        <div className="ingresos-modal-overlay">
          <div className="ingresos-modal">
            <div className="ingresos-modal__header">
              <div>
                <h2>
                  {ingresoEditando
                    ? "Editar ingreso"
                    : "Nuevo ingreso"}
                </h2>

                <p>
                  {ingresoEditando
                    ? nombreTienda(ingresoEditando.tiendaId)
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
              className="ingresos-form"
              onSubmit={guardarIngreso}
            >
              <label>
                Categoría

                <select
                  name="categoria"
                  value={formulario.categoria}
                  onChange={cambiarCampo}
                >
                  <option value="abono">Abono</option>
                  <option value="ajuste">Ajuste</option>
                  <option value="devolucion">Devolución</option>
                  <option value="otros">Otros</option>
                </select>
              </label>

              <label>
                Descripción *

                <input
                  type="text"
                  name="descripcion"
                  value={formulario.descripcion}
                  onChange={cambiarCampo}
                  placeholder="Ej. Abono recibido"
                />
              </label>

              <label>
                Monto *

                <div className="ingresos-money-input">
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
                Método de pago

                <select
                  name="metodoPago"
                  value={formulario.metodoPago}
                  onChange={cambiarCampo}
                >
                  <option value="efectivo">Efectivo</option>
                  <option value="yape">Yape</option>
                  <option value="plin">Plin</option>
                  <option value="tarjeta">Tarjeta</option>
                  <option value="transferencia">Transferencia</option>
                </select>
              </label>

              {error && (
                <div className="ingresos-form__error">
                  {error}
                </div>
              )}

              <div className="ingresos-form__actions">
                <button
                  type="button"
                  className="ingresos-cancel"
                  onClick={cerrarFormulario}
                  disabled={guardando}
                >
                  Cancelar
                </button>

                <button
                  type="submit"
                  className="ingresos-save"
                  disabled={guardando}
                >
                  {guardando
                    ? "Guardando..."
                    : ingresoEditando
                    ? "Guardar cambios"
                    : "Registrar ingreso"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default Ingresos;
