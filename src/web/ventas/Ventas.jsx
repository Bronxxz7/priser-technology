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
  ShoppingCart,
  Trash2,
  X,
} from "lucide-react";

import {
  useTienda,
} from "../../context/TiendaContext";

import {
  useAuth,
} from "../../context/AuthContext";

import {
  suscribirseEquipos,
} from "../../services/equiposService";

import {
  editarVenta,
  eliminarVenta,
  registrarVenta,
  suscribirseVentas,
} from "../../services/ventasService";

import "./Ventas.css";


const formularioInicial = {
  tipoVenta: "equipo",
  descripcion: "",
  monto: "",
  metodoPago: "efectivo",
  equipoId: "",
  modalidadVenta: "contado",
  bonoFinanciamiento: "",
};


function Ventas() {
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

  const tiendasPermitidas =
    Array.isArray(
      perfil?.tiendasPermitidas
    )
      ? perfil.tiendasPermitidas.filter(
          (id) =>
            id &&
            id !== "todas"
        )
      : [];

  const tiendaConsultaId =
    esSuperAdmin
      ? tiendaActiva?.id ||
        "todas"
      : tiendaActiva?.id &&
        tiendaActiva.id !==
          "todas" &&
        tiendasPermitidas.includes(
          tiendaActiva.id
        )
      ? tiendaActiva.id
      : tiendasPermitidas[0] ||
        "";

  const [ventas, setVentas] = useState([]);
  const [equipos, setEquipos] = useState([]);
  const [busqueda, setBusqueda] = useState("");
  const [mostrarFormulario, setMostrarFormulario] = useState(false);
  const [formulario, setFormulario] = useState(formularioInicial);
  const [guardando, setGuardando] = useState(false);
  const [ventaEditando, setVentaEditando] = useState(null);
  const [eliminandoId, setEliminandoId] = useState(null);
  const [error, setError] = useState("");

  const [
    relojDiario,
    setRelojDiario,
  ] = useState(
    Date.now()
  );

  const moneda = new Intl.NumberFormat("es-PE", {
    style: "currency",
    currency: "PEN",
  });


  /* =========================================================
     FIREBASE
  ========================================================= */

  useEffect(() => {
    if (!tiendaConsultaId) {
      setVentas([]);
      return undefined;
    }

    const cancelar =
      suscribirseVentas(
        setVentas,
        tiendaConsultaId
      );

    return cancelar;
  }, [
    tiendaConsultaId,
  ]);

  useEffect(() => {
    const cancelar = suscribirseEquipos(setEquipos);
    return cancelar;
  }, []);


  /*
    Actualiza el filtro de fecha automáticamente.
    Así, al cambiar de día, las ventas de ayer dejan de
    aparecer aunque la página permanezca abierta.
  */
  useEffect(() => {
    const intervalo =
      window.setInterval(
        () => {
          setRelojDiario(
            Date.now()
          );
        },
        30000
      );

    return () =>
      window.clearInterval(
        intervalo
      );
  }, []);


  function fechaClavePeru(
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

    return new Intl.DateTimeFormat(
      "en-CA",
      {
        timeZone:
          "America/Lima",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      }
    ).format(
      valor
    );
  }


  function esVentaDeHoy(
    venta
  ) {
    return (
      fechaClavePeru(
        venta?.fecha
      ) ===
      fechaClavePeru(
        new Date(
          relojDiario
        )
      )
    );
  }


  /* =========================================================
     VENTAS MOSTRADAS
  ========================================================= */

  const ventasMostradas = useMemo(() => {
    const texto = busqueda.trim().toLowerCase();

    return ventas.filter((venta) => {
      /*
        La pantalla Ventas es operativa y solo muestra
        movimientos del día actual. Las ventas anteriores
        permanecen en Firestore y continúan disponibles
        para Reportes/Cierres.
      */
      if (
        !esVentaDeHoy(
          venta
        )
      ) {
        return false;
      }

      const correspondeTienda =
        tiendaActiva?.id === "todas" ||
        venta.tiendaId === tiendaActiva?.id;

      if (!correspondeTienda) {
        return false;
      }

      if (!texto) {
        return true;
      }

      const contenido = [
        venta.descripcion,
        venta.tipoVenta,
        venta.metodoPago,
        venta.modalidadVenta,
        venta.imei,
        venta.tiendaId,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return contenido.includes(texto);
    });
  }, [
    ventas,
    busqueda,
    tiendaActiva,
    relojDiario,
  ]);


  /* =========================================================
     EQUIPOS DISPONIBLES
  ========================================================= */

  const equiposDisponibles = useMemo(() => {
    if (!tiendaActiva || tiendaActiva.id === "todas") {
      return [];
    }

    return equipos.filter(
      (equipo) =>
        equipo.activo !== false &&
        equipo.estado !== "vendido" &&
        equipo.ubicacionActual === tiendaActiva.id
    );
  }, [equipos, tiendaActiva]);


  /* =========================================================
     TOTAL
  ========================================================= */

  const totalVentas = ventasMostradas.reduce(
    (total, venta) => total + Number(venta.monto || 0),
    0
  );


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

  function etiquetaTipoVenta(tipo) {
    switch (
      String(tipo || "").toLowerCase()
    ) {
      case "equipo":
        return "Equipo";
      case "recarga":
        return "R. Recargas";
      case "recaudacion":
        return "Recaudación";
      default:
        return "Otra venta";
    }
  }


  function fechaVenta(fecha) {
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


  /* =========================================================
     NUEVA VENTA
  ========================================================= */

  function abrirFormulario() {
    if (!tiendaActiva || tiendaActiva.id === "todas") {
      window.alert("Selecciona primero una tienda específica.");
      return;
    }

    setVentaEditando(null);
    setFormulario({ ...formularioInicial });
    setError("");
    setMostrarFormulario(true);
  }


  /* =========================================================
     EDITAR VENTA
  ========================================================= */

  function abrirEdicion(venta) {
    setVentaEditando(venta);

    setFormulario({
      tipoVenta: venta.tipoVenta || "otro",
      descripcion: venta.descripcion || "",
      monto: String(venta.monto ?? ""),
      metodoPago: venta.metodoPago || "efectivo",
      equipoId: venta.equipoId || "",
      modalidadVenta:
        venta.modalidadVenta ||
        (venta.esFinanciado ? "financiado" : "contado"),
      bonoFinanciamiento:
        venta.esFinanciado || venta.modalidadVenta === "financiado"
          ? String(venta.bonoFinanciamiento ?? "")
          : "",
    });

    setError("");
    setMostrarFormulario(true);
  }


  /* =========================================================
     CERRAR MODAL
  ========================================================= */

  function cerrarFormulario() {
    if (guardando) {
      return;
    }

    setMostrarFormulario(false);
    setVentaEditando(null);
    setFormulario({ ...formularioInicial });
    setError("");
  }


  /* =========================================================
     FORMULARIO
  ========================================================= */

  function cambiarCampo(event) {
    const { name, value } = event.target;

    setFormulario((anterior) => ({
      ...anterior,
      [name]: value,
    }));
  }

  function cambiarTipoVenta(event) {
    const nuevoTipo =
      event.target.value;

    const descripcion =
      nuevoTipo === "recarga"
        ? "R. Recargas"
        : nuevoTipo === "recaudacion"
        ? "Recaudación"
        : "";

    setFormulario((anterior) => ({
      ...anterior,
      tipoVenta: nuevoTipo,
      equipoId: "",
      descripcion,
      monto: "",
      modalidadVenta: "contado",
      bonoFinanciamiento: "",
    }));

    setError("");
  }


  /* =========================================================
     SELECCIONAR EQUIPO
  ========================================================= */

  function seleccionarEquipo(event) {
    const equipoId = event.target.value;

    const equipo = equiposDisponibles.find(
      (item) => item.id === equipoId
    );

    if (!equipo) {
      setFormulario((anterior) => ({
        ...anterior,
        equipoId: "",
        descripcion: "",
        monto: "",
      }));

      return;
    }

    const descripcionEquipo = [
      equipo.marca,
      equipo.modelo,
      equipo.ram ? `${equipo.ram}GB` : "",
      equipo.almacenamiento
        ? `${equipo.almacenamiento}GB`
        : "",
    ]
      .filter(Boolean)
      .join(" ");

    setFormulario((anterior) => ({
      ...anterior,
      equipoId: equipo.id,
      descripcion: descripcionEquipo,
      monto:
        anterior.modalidadVenta === "financiado" &&
        equipo.precioFinanciamiento != null
          ? String(equipo.precioFinanciamiento)
          : equipo.precioVenta != null
          ? String(equipo.precioVenta)
          : "",
    }));
  }


  function cambiarModalidadVenta(event) {
    const modalidad = event.target.value;

    const equipo = equipos.find(
      (item) => item.id === formulario.equipoId
    );

    setFormulario((anterior) => ({
      ...anterior,
      modalidadVenta: modalidad,
      bonoFinanciamiento:
        modalidad === "financiado"
          ? anterior.bonoFinanciamiento
          : "",
      monto:
        equipo
          ? modalidad === "financiado" &&
            equipo.precioFinanciamiento != null
            ? String(equipo.precioFinanciamiento)
            : equipo.precioVenta != null
            ? String(equipo.precioVenta)
            : anterior.monto
          : anterior.monto,
    }));
  }


  /* =========================================================
     GUARDAR / EDITAR
  ========================================================= */

  async function guardarVenta(event) {
    event.preventDefault();
    setError("");

    /*
     * Una venta NUEVA necesita una tienda específica.
     * Una EDICIÓN puede realizarse incluso viendo "TODAS".
     */
    if (
      !ventaEditando &&
      (!tiendaActiva || tiendaActiva.id === "todas")
    ) {
      setError("Selecciona una tienda.");
      return;
    }

    if (
      !ventaEditando &&
      formulario.tipoVenta === "equipo" &&
      !formulario.equipoId
    ) {
      setError("Selecciona el equipo vendido.");
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

    if (!formulario.metodoPago) {
      setError("Selecciona un método de pago.");
      return;
    }

    if (
      formulario.tipoVenta === "equipo" &&
      !["contado", "financiado"].includes(
        formulario.modalidadVenta
      )
    ) {
      setError("Selecciona si la venta del equipo fue al contado o financiada.");
      return;
    }

    const bonoNumero = Number(
      formulario.bonoFinanciamiento || 0
    );

    if (
      formulario.tipoVenta === "equipo" &&
      formulario.modalidadVenta === "financiado" &&
      (!Number.isFinite(bonoNumero) || bonoNumero <= 0)
    ) {
      setError("Ingresa el bono correspondiente a la venta financiada.");
      return;
    }

    const equipo = equipos.find(
      (item) => item.id === formulario.equipoId
    );

    try {
      setGuardando(true);

      if (ventaEditando) {
        await editarVenta(ventaEditando.id, {
          descripcion: formulario.descripcion,
          monto: montoNumero,
          metodoPago: formulario.metodoPago,
          modalidadVenta:
            formulario.tipoVenta === "equipo"
              ? formulario.modalidadVenta
              : "",
          esFinanciado:
            formulario.tipoVenta === "equipo" &&
            formulario.modalidadVenta === "financiado",
          bonoFinanciamiento:
            formulario.tipoVenta === "equipo" &&
            formulario.modalidadVenta === "financiado"
              ? bonoNumero
              : 0,
        });
      } else {
        await registrarVenta({
          tiendaId: tiendaActiva.id,
          tipoVenta: formulario.tipoVenta,
          descripcion: formulario.descripcion,
          monto: montoNumero,
          metodoPago: formulario.metodoPago,
          modalidadVenta:
            formulario.tipoVenta === "equipo"
              ? formulario.modalidadVenta
              : "",
          bonoFinanciamiento:
            formulario.tipoVenta === "equipo" &&
            formulario.modalidadVenta === "financiado"
              ? bonoNumero
              : 0,
          equipo:
            formulario.tipoVenta === "equipo"
              ? equipo
              : null,
        });
      }

      setMostrarFormulario(false);
      setVentaEditando(null);
      setFormulario({ ...formularioInicial });
      setError("");
    } catch (errorGuardado) {
      console.error("Error guardando venta:", errorGuardado);

      setError(
        errorGuardado.message ||
          "No se pudo guardar la venta."
      );
    } finally {
      setGuardando(false);
    }
  }


  /* =========================================================
     ELIMINAR DEFINITIVAMENTE
  ========================================================= */

  async function borrarVenta(venta) {
    if (!venta?.id || eliminandoId) {
      return;
    }

    const confirmar = window.confirm(
      `¿Eliminar esta venta definitivamente?

${venta.descripcion || ""}

${moneda.format(Number(venta.monto || 0))}

Esta acción no se puede deshacer.`
    );

    if (!confirmar) {
      return;
    }

    try {
      setEliminandoId(venta.id);

      await eliminarVenta(venta);
    } catch (errorEliminacion) {
      console.error(
        "Error eliminando venta:",
        errorEliminacion
      );

      window.alert(
        errorEliminacion.message ||
          "No se pudo eliminar la venta."
      );
    } finally {
      setEliminandoId(null);
    }
  }


  return (
    <div className="ventas-page">

      {/* =====================================================
          HEADER
      ===================================================== */}

      <div className="ventas-header">
        <div>
          <h1>Ventas</h1>

          <p>
            {tiendaActiva?.id === "todas"
              ? "Ventas registradas hoy en todas las tiendas."
              : `Ventas de hoy en ${tiendaActiva?.nombre || ""}.`}
          </p>
        </div>

        <button
          type="button"
          className="ventas-add"
          onClick={abrirFormulario}
        >
          <Plus size={18} />
          Nueva venta
        </button>
      </div>


      {/* =====================================================
          RESUMEN
      ===================================================== */}

      <div className="ventas-summary">
        <article>
          <div>
            <ShoppingCart size={21} />
          </div>

          <span>Operaciones de hoy</span>

          <strong>
            {ventasMostradas.length}
          </strong>
        </article>

        <article>
          <div>
            <CircleDollarSign size={21} />
          </div>

          <span>Total mostrado</span>

          <strong>
            {moneda.format(totalVentas)}
          </strong>
        </article>
      </div>


      {/* =====================================================
          BUSCADOR
      ===================================================== */}

      <div className="ventas-search">
        <Search size={18} />

        <input
          type="text"
          placeholder="Buscar descripción, IMEI, tienda o método de pago..."
          value={busqueda}
          onChange={(event) =>
            setBusqueda(event.target.value)
          }
        />
      </div>


      {/* =====================================================
          TABLA
      ===================================================== */}

      <div className="ventas-table-card">

        <div className="ventas-table__head">
          <span>Descripción</span>
          <span>Tienda</span>
          <span>Tipo</span>
          <span>Pago</span>
          <span>Fecha</span>
          <span>Monto</span>
          <span>Acciones</span>
        </div>


        {ventasMostradas.length === 0 ? (
          <div className="ventas-empty">
            <ShoppingCart size={36} />

            <strong>
              Sin ventas registradas
            </strong>

            <span>
              Las ventas reales aparecerán aquí.
            </span>
          </div>
        ) : (
          ventasMostradas.map((venta) => (
            <div
              className="ventas-table__row"
              key={venta.id}
            >

              <div>
                <strong>
                  {venta.descripcion}
                </strong>

                {venta.imei && (
                  <small>
                    IMEI: {venta.imei}
                  </small>
                )}

                {venta.tipoVenta === "equipo" && (
                  <small>
                    Modalidad: {
                      venta.modalidadVenta === "financiado" || venta.esFinanciado === true
                        ? "Financiado"
                        : venta.modalidadVenta === "contado" || venta.esFinanciado === false
                        ? "Contado"
                        : "No registrado"
                    }
                    {(venta.modalidadVenta === "financiado" || venta.esFinanciado === true) &&
                    Number(venta.bonoFinanciamiento || 0) > 0
                      ? ` · Bono ${moneda.format(Number(venta.bonoFinanciamiento || 0))}`
                      : ""}
                  </small>
                )}
              </div>


              <span>
                {nombreTienda(
                  venta.tiendaId
                )}
              </span>


              <span className="ventas-badge">
                {etiquetaTipoVenta(
                  venta.tipoVenta
                )}
              </span>


              <span>
                {venta.metodoPago}
              </span>


              <span>
                {fechaVenta(
                  venta.fecha
                )}
              </span>


              <strong className="ventas-amount">
                {moneda.format(
                  Number(
                    venta.monto || 0
                  )
                )}
              </strong>


              <div className="ventas-actions">

                <button
                  type="button"
                  className="ventas-edit-button"
                  title="Editar venta"
                  disabled={
                    eliminandoId ===
                    venta.id
                  }
                  onClick={() =>
                    abrirEdicion(
                      venta
                    )
                  }
                >
                  <Pencil size={16} />
                </button>


                <button
                  type="button"
                  className="ventas-delete-button"
                  title="Eliminar venta"
                  disabled={
                    eliminandoId ===
                    venta.id
                  }
                  onClick={() =>
                    borrarVenta(
                      venta
                    )
                  }
                >
                  <Trash2 size={16} />
                </button>

              </div>

            </div>
          ))
        )}

      </div>


      {/* =====================================================
          MODAL
      ===================================================== */}

      {mostrarFormulario && (
        <div className="ventas-modal-overlay">

          <div className="ventas-modal">

            <div className="ventas-modal__header">

              <div>
                <h2>
                  {ventaEditando
                    ? "Editar venta"
                    : "Nueva venta"}
                </h2>

                <p>
                  {ventaEditando
                    ? nombreTienda(
                        ventaEditando.tiendaId
                      )
                    : tiendaActiva?.nombre}
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
              className="ventas-form"
              onSubmit={
                guardarVenta
              }
            >

              {/* TIPO DE VENTA */}

              <label>
                Tipo de venta

                <select
                  name="tipoVenta"
                  value={
                    formulario.tipoVenta
                  }
                  onChange={
                    cambiarTipoVenta
                  }
                  disabled={
                    Boolean(
                      ventaEditando
                    )
                  }
                >
                  <option value="equipo">
                    Equipo
                  </option>

                  <option value="recarga">
                    R. Recargas
                  </option>

                  <option value="recaudacion">
                    Recaudación
                  </option>

                  <option value="otro">
                    Otra venta
                  </option>
                </select>
              </label>


              {/* EQUIPO DISPONIBLE */}

              {formulario.tipoVenta === "equipo" &&
                !ventaEditando && (
                  <label>
                    Equipo disponible

                    <select
                      value={
                        formulario.equipoId
                      }
                      onChange={
                        seleccionarEquipo
                      }
                    >
                      <option value="">
                        Selecciona un equipo
                      </option>

                      {equiposDisponibles.map(
                        (equipo) => (
                          <option
                            key={equipo.id}
                            value={equipo.id}
                          >
                            {[
                              equipo.marca,
                              equipo.modelo,
                              equipo.color,
                            ]
                              .filter(Boolean)
                              .join(" ")}
                            {equipo.imei
                              ? ` - IMEI ${equipo.imei}`
                              : ""}
                          </option>
                        )
                      )}
                    </select>
                  </label>
                )}


              {/* EQUIPO QUE YA FUE VENDIDO */}

              {ventaEditando &&
                ventaEditando.tipoVenta === "equipo" && (
                  <div className="ventas-equipo-editando">
                    <strong>
                      Equipo vendido
                    </strong>

                    <span>
                      {ventaEditando.descripcion}
                    </span>

                    {ventaEditando.imei && (
                      <small>
                        IMEI: {ventaEditando.imei}
                      </small>
                    )}
                  </div>
                )}


              {/* DESCRIPCIÓN */}

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
                  placeholder="Descripción de la venta"
                  readOnly={
                    [
                      "equipo",
                      "recarga",
                      "recaudacion",
                    ].includes(
                      formulario.tipoVenta
                    )
                  }
                />
              </label>


              {/* MONTO */}

              <label>
                {formulario.tipoVenta === "recarga"
                  ? "Monto de R. Recargas"
                  : formulario.tipoVenta === "recaudacion"
                  ? "Monto de Recaudación"
                  : "Monto"}

                <div className="ventas-money-input">
                  <span>S/</span>

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
                    placeholder="0.00"
                  />
                </div>
              </label>


              {formulario.tipoVenta === "equipo" && (
                <>
                  <label>
                    Modalidad de venta

                    <select
                      name="modalidadVenta"
                      value={formulario.modalidadVenta}
                      onChange={cambiarModalidadVenta}
                    >
                      <option value="contado">
                        Contado
                      </option>

                      <option value="financiado">
                        Financiado
                      </option>
                    </select>
                  </label>

                  {formulario.modalidadVenta === "financiado" && (
                    <label>
                      Bono de financiamiento

                      <div className="ventas-money-input">
                        <span>S/</span>

                        <input
                          type="number"
                          min="0.01"
                          step="0.01"
                          name="bonoFinanciamiento"
                          value={formulario.bonoFinanciamiento}
                          onChange={cambiarCampo}
                          placeholder="0.00"
                        />
                      </div>
                    </label>
                  )}
                </>
              )}


              {/* MÉTODO DE PAGO */}

              <label>
                Método de pago

                <select
                  name="metodoPago"
                  value={
                    formulario.metodoPago
                  }
                  onChange={
                    cambiarCampo
                  }
                >
                  <option value="efectivo">
                    Efectivo
                  </option>

                  <option value="yape">
                    Yape
                  </option>

                  <option value="plin">
                    Plin
                  </option>

                  <option value="tarjeta">
                    Tarjeta
                  </option>

                  <option value="transferencia">
                    Transferencia
                  </option>
                </select>
              </label>


              {/* ERROR */}

              {error && (
                <div className="ventas-form__error">
                  {error}
                </div>
              )}


              {/* BOTONES */}

              <div className="ventas-form__actions">

                <button
                  type="button"
                  className="ventas-cancel"
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
                  className="ventas-save"
                  disabled={
                    guardando
                  }
                >
                  {guardando
                    ? "Guardando..."
                    : ventaEditando
                    ? "Guardar cambios"
                    : "Registrar venta"}
                </button>

              </div>

            </form>

          </div>

        </div>
      )}

    </div>
  );
}


export default Ventas;