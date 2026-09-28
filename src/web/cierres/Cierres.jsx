import {
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  CalendarDays,
  Coins,
  Download,
  Pencil,
  RotateCcw,
  Search,
  Store,
  Trash2,
  X,
} from "lucide-react";

import {
  useNavigate,
} from "react-router-dom";

import {
  useTienda,
} from "../../context/TiendaContext";

import {
  useAuth,
} from "../../context/AuthContext";

import {
  calcularTotalConteo,
  crearConteoEfectivoVacio,
  editarCierre,
  eliminarCajaAbiertaAnterior,
  eliminarCierreDefinitivamente,
  obtenerDatosDescargaCierre,
  reabrirCajaDesdeCierre,
  suscribirseCajasAbiertasAnteriores,
  suscribirseCierres,
} from "../../services/cierresService";

import "./Cierres.css";


function Cierres() {
  const {
    tiendaActiva,
    tiendas,
  } = useTienda();

  const {
    perfil,
  } = useAuth();

  const navigate =
    useNavigate();

  const rol =
    String(
      perfil?.rol || ""
    )
      .trim()
      .toLowerCase();

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

  const esAdministrador =
    esSuperAdmin ||
    rol ===
      "administrador" ||
    rol ===
      "admin";

  const esVendedor =
    rol ===
    "vendedor";

  const puedeGestionarCierres =
    esAdministrador ||
    esVendedor;

  const [
    cierres,
    setCierres,
  ] = useState([]);


  const [
    cajasAbiertasAnteriores,
    setCajasAbiertasAnteriores,
  ] = useState([]);

  const [
    eliminandoCajaId,
    setEliminandoCajaId,
  ] = useState(null);


  const [
    eliminandoCierreId,
    setEliminandoCierreId,
  ] = useState(null);


  const [
    descargandoId,
    setDescargandoId,
  ] = useState(null);

  const [
    busqueda,
    setBusqueda,
  ] = useState("");

  const [
    fechaDesde,
    setFechaDesde,
  ] = useState("");

  const [
    fechaHasta,
    setFechaHasta,
  ] = useState("");

  const [
    cierreEditando,
    setCierreEditando,
  ] = useState(null);

  const [
    conteoEditando,
    setConteoEditando,
  ] = useState(
    crearConteoEfectivoVacio()
  );

  const [
    observacionEditando,
    setObservacionEditando,
  ] = useState("");

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
    if (
      !tiendaConsultaId
    ) {
      setCierres([]);
      return undefined;
    }

    const cancelar =
      suscribirseCierres(
        setCierres,
        tiendaConsultaId
      );

    return cancelar;
  }, [
    tiendaConsultaId,
  ]);


  useEffect(() => {
    if (
      !esSuperAdmin ||
      !tiendaActiva?.id
    ) {
      setCajasAbiertasAnteriores(
        []
      );

      return undefined;
    }

    const cancelar =
      suscribirseCajasAbiertasAnteriores(
        setCajasAbiertasAnteriores,
        tiendaActiva.id
      );

    return cancelar;
  }, [
    esSuperAdmin,
    tiendaActiva?.id,
  ]);


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


  function obtenerFecha(fecha) {
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

    return Number.isNaN(
      convertida.getTime()
    )
      ? null
      : convertida;
  }


  function fechaTexto(fecha) {
    const valor =
      obtenerFecha(fecha);

    if (!valor) {
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


  function diasAntiguedad(
    fecha
  ) {
    const valor =
      obtenerFecha(
        fecha
      );

    if (!valor) {
      return 0;
    }

    const formato =
      new Intl.DateTimeFormat(
        "en-CA",
        {
          timeZone:
            "America/Lima",
          year: "numeric",
          month: "2-digit",
          day: "2-digit",
        }
      );

    const inicio =
      new Date(
        `${formato.format(valor)}T00:00:00-05:00`
      );

    const hoy =
      new Date(
        `${formato.format(new Date())}T00:00:00-05:00`
      );

    return Math.max(
      0,
      Math.floor(
        (
          hoy.getTime() -
          inicio.getTime()
        ) /
          86400000
      )
    );
  }


  function descargarCanvas(
    canvas,
    nombre
  ) {
    const enlace =
      document.createElement(
        "a"
      );

    enlace.download =
      nombre;

    enlace.href =
      canvas.toDataURL(
        "image/png"
      );

    enlace.click();
  }


  function prepararCanvas({
    ancho = 980,
    alto = 1200,
  }) {
    const escala =
      2;

    const canvas =
      document.createElement(
        "canvas"
      );

    canvas.width =
      ancho * escala;

    canvas.height =
      alto * escala;

    const ctx =
      canvas.getContext(
        "2d"
      );

    ctx.scale(
      escala,
      escala
    );

    ctx.fillStyle =
      "#ffffff";

    ctx.fillRect(
      0,
      0,
      ancho,
      alto
    );

    ctx.textBaseline =
      "top";

    return {
      canvas,
      ctx,
      ancho,
      alto,
    };
  }


  function escribirLinea(
    ctx,
    texto,
    x,
    y,
    {
      tamano = 16,
      peso = 400,
      color = "#101828",
      maxWidth = null,
    } = {}
  ) {
    ctx.fillStyle =
      color;

    ctx.font =
      `${peso} ${tamano}px Arial, sans-serif`;

    if (maxWidth) {
      ctx.fillText(
        String(texto),
        x,
        y,
        maxWidth
      );
    } else {
      ctx.fillText(
        String(texto),
        x,
        y
      );
    }
  }


  function lineaSeparadora(
    ctx,
    y,
    ancho = 900
  ) {
    ctx.strokeStyle =
      "#e4e7ec";

    ctx.lineWidth =
      1;

    ctx.beginPath();

    ctx.moveTo(
      40,
      y
    );

    ctx.lineTo(
      40 + ancho,
      y
    );

    ctx.stroke();
  }


  function fechaArchivo(
    fecha
  ) {
    const valor =
      obtenerFecha(
        fecha
      ) ||
      new Date();

    return valor
      .toLocaleDateString(
        "es-PE"
      )
      .replaceAll(
        "/",
        "-"
      );
  }


  function fechaPeruClave(
    fecha
  ) {
    const valor =
      obtenerFecha(
        fecha
      );

    if (!valor) {
      return "";
    }

    const partes =
      new Intl.DateTimeFormat(
        "en-CA",
        {
          timeZone:
            "America/Lima",
          year: "numeric",
          month: "2-digit",
          day: "2-digit",
        }
      ).formatToParts(
        valor
      );

    const mapa =
      Object.fromEntries(
        partes.map(
          (parte) => [
            parte.type,
            parte.value,
          ]
        )
      );

    return `${mapa.year}-${mapa.month}-${mapa.day}`;
  }


  function cierreEsDelDiaActual(
    cierre
  ) {
    const fechaApertura =
      cierre?.fechaApertura;

    if (!fechaApertura) {
      return false;
    }

    return (
      fechaPeruClave(
        fechaApertura
      ) ===
      fechaPeruClave(
        new Date()
      )
    );
  }


  function puedeReabrir(
    cierre
  ) {
    if (
      !cierre ||
      cierre.estado ===
        "reabierto"
    ) {
      return false;
    }

    if (esAdministrador) {
      return true;
    }

    return (
      esVendedor &&
      cierreEsDelDiaActual(
        cierre
      )
    );
  }


  function estadoDinero(
    diferencia
  ) {
    const valor =
      Number(
        diferencia || 0
      );

    if (
      Math.abs(valor) <
      0.005
    ) {
      return {
        tipo: "conforme",
        texto: "Caja conforme",
      };
    }

    if (valor < 0) {
      return {
        tipo: "faltante",
        texto: `Falta ${moneda.format(
          Math.abs(valor)
        )}`,
      };
    }

    return {
      tipo: "sobrante",
      texto: `Sobra ${moneda.format(
        valor
      )}`,
    };
  }


  function dentroRango(fecha) {
    const valor =
      obtenerFecha(fecha);

    if (
      !fechaDesde &&
      !fechaHasta
    ) {
      return true;
    }

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


  const cierresFiltrados =
    useMemo(() => {
      const texto =
        busqueda
          .trim()
          .toLowerCase();

      return cierres.filter(
        (cierre) => {
          if (
            tiendaActiva?.id !==
              "todas" &&
            cierre.tiendaId !==
              tiendaActiva?.id
          ) {
            return false;
          }

          if (
            !dentroRango(
              cierre.fechaCierre
            )
          ) {
            return false;
          }

          if (!texto) {
            return true;
          }

          const contenido = [
            nombreTienda(
              cierre.tiendaId
            ),
            cierre.observacion,
            cierre.cajaId,
            cierre.numeroCierre,
            cierre.estado,
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
      cierres,
      tiendaActiva,
      busqueda,
      fechaDesde,
      fechaHasta,
      tiendas,
    ]);


  const resumen =
    useMemo(() => {
      return {
        cantidad:
          cierresFiltrados.length,

        esperado:
          cierresFiltrados.reduce(
            (total, cierre) =>
              total +
              Number(
                cierre.cajaEsperada ||
                  0
              ),
            0
          ),

        contado:
          cierresFiltrados.reduce(
            (total, cierre) =>
              total +
              Number(
                cierre.efectivoContado ||
                  0
              ),
            0
          ),

        diferencia:
          cierresFiltrados.reduce(
            (total, cierre) =>
              total +
              Number(
                cierre.diferencia ||
                  0
              ),
            0
          ),
      };
    }, [
      cierresFiltrados,
    ]);


  const totalEditando =
    useMemo(
      () =>
        calcularTotalConteo(
          conteoEditando
        ),
      [
        conteoEditando,
      ]
    );


  const diferenciaEditando =
    useMemo(
      () =>
        totalEditando -
        Number(
          cierreEditando?.cajaEsperada ||
            0
        ),
      [
        totalEditando,
        cierreEditando,
      ]
    );


  function cambiarCantidad(
    clave,
    valor
  ) {
    const cantidad =
      Math.max(
        0,
        Math.trunc(
          Number(
            valor || 0
          )
        )
      );

    setConteoEditando(
      (anterior) => ({
        ...anterior,

        [clave]:
          Number.isFinite(
            cantidad
          )
            ? cantidad
            : 0,
      })
    );
  }


  function abrirEdicion(
    cierre
  ) {
    if (
      !esAdministrador ||
      cierre.estado ===
        "reabierto"
    ) {
      return;
    }

    setError("");

    setCierreEditando(
      cierre
    );

    setConteoEditando({
      ...crearConteoEfectivoVacio(),
      ...(
        cierre.conteoEfectivo ||
        {}
      ),
    });

    setObservacionEditando(
      cierre.observacion ||
        ""
    );
  }


  function cerrarEdicion() {
    if (guardando) {
      return;
    }

    setCierreEditando(
      null
    );

    setConteoEditando(
      crearConteoEfectivoVacio()
    );

    setObservacionEditando("");
    setError("");
  }


  async function guardarEdicion(
    event
  ) {
    event.preventDefault();

    if (
      !esAdministrador ||
      !cierreEditando?.id
    ) {
      return;
    }

    try {
      setGuardando(true);
      setError("");

      await editarCierre({
        cierreId:
          cierreEditando.id,

        conteoEfectivo:
          conteoEditando,

        observacion:
          observacionEditando,
      });

      setCierreEditando(
        null
      );

      setConteoEditando(
        crearConteoEfectivoVacio()
      );

      setObservacionEditando("");
      setError("");
    } catch (
      errorEdicion
    ) {
      setError(
        errorEdicion.message ||
          "No se pudo editar el cierre."
      );
    } finally {
      setGuardando(false);
    }
  }


  async function reabrir(
    cierre
  ) {
    if (
      cierre.estado ===
      "reabierto"
    ) {
      return;
    }

    if (
      !puedeReabrir(
        cierre
      )
    ) {
      window.alert(
        "Esta caja fue abierta en un día anterior. Solo un administrador puede reabrirla."
      );

      return;
    }

    const confirmar =
      window.confirm(
        `¿Reabrir la caja de ${nombreTienda(
          cierre.tiendaId
        )}?\n\nEl cierre actual quedará guardado en el historial como REABIERTO. Cuando vuelvas a cerrar la caja se creará un nuevo cierre independiente.${esVendedor && !esAdministrador ? "\n\nEsta reapertura está permitida porque la caja fue abierta hoy." : ""}`
      );

    if (!confirmar) {
      return;
    }

    try {
      setGuardando(true);

      await reabrirCajaDesdeCierre(
        cierre.id
      );

      window.alert(
        "Caja reabierta. El cierre anterior quedó guardado en el historial."
      );

      navigate(
        "/admin/caja"
      );
    } catch (
      errorReapertura
    ) {
      window.alert(
        errorReapertura.message ||
          "No se pudo reabrir la caja."
      );
    } finally {
      setGuardando(false);
    }
  }


  async function eliminarCierre(
    cierre
  ) {
    if (
      !esSuperAdmin ||
      !cierre?.id
    ) {
      return;
    }

    const confirmar =
      window.confirm(
        `¿Eliminar DEFINITIVAMENTE el cierre #${cierre.numeroCierre || "-"} de ${nombreTienda(
          cierre.tiendaId
        )}?\n\nFecha: ${fechaTexto(
          cierre.fechaCierre
        )}\nContado: ${moneda.format(
          Number(
            cierre.efectivoContado ||
              0
          )
        )}\n\nEl documento se borrará físicamente de Firestore. Las ventas, gastos, ingresos y retiros NO se eliminarán.\n\nSi este es el cierre vigente, la caja volverá a quedar ABIERTA para evitar que apunte a un cierre inexistente.`
      );

    if (!confirmar) {
      return;
    }

    try {
      setEliminandoCierreId(
        cierre.id
      );

      await eliminarCierreDefinitivamente(
        cierre.id
      );

      window.alert(
        "Cierre eliminado definitivamente de Firestore."
      );
    } catch (
      errorEliminacion
    ) {
      window.alert(
        errorEliminacion.message ||
          "No se pudo eliminar el cierre."
      );
    } finally {
      setEliminandoCierreId(
        null
      );
    }
  }


  async function eliminarCajaAnterior(
    caja
  ) {
    if (
      !esSuperAdmin ||
      !caja?.id
    ) {
      return;
    }

    const confirmar =
      window.confirm(
        `¿Eliminar DEFINITIVAMENTE esta caja anterior de ${nombreTienda(
          caja.tiendaId
        )}?\n\nApertura: ${fechaTexto(
          caja.fechaApertura
        )}\nCaja inicial: ${moneda.format(
          Number(
            caja.cajaInicial ||
              0
          )
        )}\n\nSolo se eliminará si NO tiene ventas, gastos, ingresos ni retiros asociados. Si tenía cierres previos sin movimientos, esos cierres también se borrarán físicamente de Firestore.`
      );

    if (!confirmar) {
      return;
    }

    try {
      setEliminandoCajaId(
        caja.id
      );

      const resultado =
        await eliminarCajaAbiertaAnterior(
          caja.id
        );

      window.alert(
        resultado.cierresEliminados >
          0
          ? `Caja eliminada definitivamente. También se eliminaron ${resultado.cierresEliminados} cierre(s) asociado(s).`
          : "Caja eliminada definitivamente de Firestore."
      );
    } catch (
      errorEliminacion
    ) {
      window.alert(
        errorEliminacion.message ||
          "No se pudo eliminar la caja anterior."
      );
    } finally {
      setEliminandoCajaId(
        null
      );
    }
  }


  async function descargarResumenCierre(
    cierre
  ) {
    try {
      setDescargandoId(
        `resumen-${cierre.id}`
      );

      const datos =
        await obtenerDatosDescargaCierre(
          cierre.id
        );

      const control =
        datos.controlEquipos ||
        {};

      const ventasEquipo =
        control.ventasEquipo ||
        [];

      const efectivo =
        datos.efectivoVisible ||
        [];

      const recargas =
        datos.plataformas
          ?.recargas || {};

      const recaudacion =
        datos.plataformas
          ?.recaudacion || {};


      /*
        El cierre puede generar 1 o 2 imágenes.

        - Si todo entra cómodamente en la primera página:
          descarga 1 PNG.

        - Si el detalle de ventas de equipos ya no entra:
          la primera imagen termina antes de cortar contenido
          y la segunda continúa automáticamente.

        Así evitamos imágenes excesivamente largas o secciones
        cortadas por la parte inferior.
      */
      const ALTO_PAGINA =
        1280;

      const LIMITE_CONTENIDO =
        ALTO_PAGINA - 78;


      function altoVentaEquipo(
        item
      ) {
        let alto =
          21 + // nombre
          19 + // IMEI
          19 + // modalidad
          11;  // separación

        if (
          item.financiado
        ) {
          alto +=
            19;
        }

        return alto;
      }


      function piePagina({
        ctx,
        ancho,
        alto,
        pagina,
        totalPaginas,
      }) {
        escribirLinea(
          ctx,
          "Priser Technology",
          ancho - 190,
          alto - 34,
          {
            tamano: 11,
            color: "#98a2b3",
          }
        );

        if (
          totalPaginas > 1
        ) {
          escribirLinea(
            ctx,
            `Página ${pagina} de ${totalPaginas}`,
            40,
            alto - 34,
            {
              tamano: 11,
              color: "#98a2b3",
            }
          );
        }
      }


      function dibujarEncabezado({
        ctx,
        control,
        cierre,
        continuacion = false,
      }) {
        let y =
          34;

        escribirLinea(
          ctx,
          continuacion
            ? "CIERRE DE CAJA · CONTINUACIÓN"
            : "CIERRE DE CAJA",
          40,
          y,
          {
            tamano:
              continuacion
                ? 24
                : 28,
            peso: 800,
          }
        );

        y +=
          continuacion
            ? 38
            : 42;

        escribirLinea(
          ctx,
          `${control.tiendaNombre || nombreTienda(cierre.tiendaId)} · ${fechaTexto(cierre.fechaCierre)}`,
          40,
          y,
          {
            tamano: 15,
            color: "#667085",
          }
        );

        y += 38;

        lineaSeparadora(
          ctx,
          y
        );

        y += 22;

        return y;
      }


      function dibujarVentaEquipo({
        ctx,
        item,
        indice,
        y,
      }) {
        escribirLinea(
          ctx,
          `${indice + 1}. ${item.nombre || "Equipo"}`,
          55,
          y,
          {
            tamano: 14,
            peso: 700,
            maxWidth: 850,
          }
        );

        y += 21;

        escribirLinea(
          ctx,
          `IMEI: ${item.imei || "-"}`,
          70,
          y,
          {
            tamano: 12,
            color: "#667085",
          }
        );

        y += 19;

        escribirLinea(
          ctx,
          `Modalidad: ${
            item.modalidadVenta === "financiado"
              ? "FINANCIADO"
              : item.modalidadVenta === "contado"
              ? "CONTADO"
              : "NO REGISTRADO"
          }`,
          70,
          y,
          {
            tamano: 12,
            color: "#667085",
          }
        );

        y += 19;

        if (
          item.financiado
        ) {
          escribirLinea(
            ctx,
            `Bono de financiamiento: ${moneda.format(
              Number(
                item.bonoFinanciamiento ||
                0
              )
            )}`,
            70,
            y,
            {
              tamano: 12,
              color: "#667085",
            }
          );

          y += 19;
        }

        y += 11;

        return y;
      }


      /*
        PRIMERA PÁGINA:
        toda la información financiera + el máximo número posible
        de ventas de equipos sin cortar ninguna.
      */
      const pagina1 =
        prepararCanvas({
          ancho: 980,
          alto: ALTO_PAGINA,
        });

      let y =
        dibujarEncabezado({
          ctx:
            pagina1.ctx,
          control,
          cierre,
        });


      escribirLinea(
        pagina1.ctx,
        "CAJA FÍSICA",
        40,
        y,
        {
          tamano: 18,
          peso: 800,
        }
      );

      y += 32;

      [
        ["Caja inicial", cierre.cajaInicial],
        ["Ventas efectivo", cierre.ventas],
        ["Ingresos efectivo", cierre.ingresos],
        ["Gastos efectivo", cierre.gastos],
        ["Retiros efectivo", cierre.retiros],
        ["Caja esperada", cierre.cajaEsperada],
        ["Efectivo contado", cierre.efectivoContado],
        ["Diferencia", cierre.diferencia],
      ].forEach(
        ([etiqueta, valor]) => {
          escribirLinea(
            pagina1.ctx,
            etiqueta,
            55,
            y,
            {
              tamano: 15,
              color: "#475467",
            }
          );

          escribirLinea(
            pagina1.ctx,
            moneda.format(
              Number(
                valor || 0
              )
            ),
            720,
            y,
            {
              tamano: 15,
              peso: 700,
            }
          );

          y += 27;
        }
      );

      y += 10;

      lineaSeparadora(
        pagina1.ctx,
        y
      );

      y += 22;


      escribirLinea(
        pagina1.ctx,
        "DETALLE DE EFECTIVO",
        40,
        y,
        {
          tamano: 18,
          peso: 800,
        }
      );

      y += 31;


      if (
        efectivo.length ===
        0
      ) {
        escribirLinea(
          pagina1.ctx,
          "No hay denominaciones registradas.",
          55,
          y,
          {
            tamano: 14,
            color: "#667085",
          }
        );

        y += 30;
      } else {
        let tipoAnterior =
          "";

        efectivo.forEach(
          (item) => {
            const tipo =
              item.tipo ===
              "billete"
                ? "Billetes"
                : "Monedas";

            if (
              tipo !==
              tipoAnterior
            ) {
              escribirLinea(
                pagina1.ctx,
                tipo,
                55,
                y,
                {
                  tamano: 14,
                  peso: 800,
                  color: "#344054",
                }
              );

              y += 25;

              tipoAnterior =
                tipo;
            }

            escribirLinea(
              pagina1.ctx,
              item.etiqueta ||
                item.clave,
              72,
              y,
              {
                tamano: 14,
              }
            );

            escribirLinea(
              pagina1.ctx,
              item.detalleCantidad ||
                `x ${Number(
                  item.cantidad ||
                  0
                )}`,
              250,
              y,
              {
                tamano: 14,
                color: "#475467",
              }
            );

            escribirLinea(
              pagina1.ctx,
              moneda.format(
                Number(
                  item.subtotal ||
                  0
                )
              ),
              720,
              y,
              {
                tamano: 14,
                peso: 700,
              }
            );

            y += 26;
          }
        );
      }


      y += 7;

      lineaSeparadora(
        pagina1.ctx,
        y
      );

      y += 22;


      escribirLinea(
        pagina1.ctx,
        "R. RECARGAS",
        40,
        y,
        {
          tamano: 18,
          peso: 800,
        }
      );

      y += 31;

      [
        ["Saldo inicial", recargas.saldoInicial],
        ["Usado", recargas.usado],
        ["Saldo actual", recargas.saldoActual],
      ].forEach(
        ([etiqueta, valor]) => {
          escribirLinea(
            pagina1.ctx,
            etiqueta,
            55,
            y,
            {
              tamano: 14,
              color: "#475467",
            }
          );

          escribirLinea(
            pagina1.ctx,
            moneda.format(
              Number(
                valor || 0
              )
            ),
            720,
            y,
            {
              tamano: 14,
              peso: 700,
            }
          );

          y += 25;
        }
      );


      y += 7;


      escribirLinea(
        pagina1.ctx,
        "RECAUDACIÓN",
        40,
        y,
        {
          tamano: 18,
          peso: 800,
        }
      );

      y += 31;

      [
        ["Saldo inicial", recaudacion.saldoInicial],
        ["Usado", recaudacion.usado],
        ["Saldo actual", recaudacion.saldoActual],
      ].forEach(
        ([etiqueta, valor]) => {
          escribirLinea(
            pagina1.ctx,
            etiqueta,
            55,
            y,
            {
              tamano: 14,
              color: "#475467",
            }
          );

          escribirLinea(
            pagina1.ctx,
            moneda.format(
              Number(
                valor || 0
              )
            ),
            720,
            y,
            {
              tamano: 14,
              peso: 700,
            }
          );

          y += 25;
        }
      );


      y += 10;

      lineaSeparadora(
        pagina1.ctx,
        y
      );

      y += 22;


      escribirLinea(
        pagina1.ctx,
        "VENTAS Y EQUIPOS DEL DÍA",
        40,
        y,
        {
          tamano: 18,
          peso: 800,
        }
      );

      y += 32;

      [
        [
          "Ventas registradas",
          control.cantidadVentas ||
            0,
        ],
        [
          "Total ventas",
          moneda.format(
            Number(
              control.totalVentas ||
                0
            )
          ),
        ],
        [
          "Equipos que llegaron",
          control.ingresos?.length ||
            0,
        ],
        [
          "Equipos que salieron",
          control.salidas?.length ||
            0,
        ],
        [
          "Equipos vendidos",
          ventasEquipo.length,
        ],
        [
          "Stock actual",
          control.stockActual
            ?.length || 0,
        ],
      ].forEach(
        ([etiqueta, valor]) => {
          escribirLinea(
            pagina1.ctx,
            etiqueta,
            55,
            y,
            {
              tamano: 14,
              color: "#475467",
            }
          );

          escribirLinea(
            pagina1.ctx,
            valor,
            720,
            y,
            {
              tamano: 14,
              peso: 700,
            }
          );

          y += 25;
        }
      );


      y += 10;

      lineaSeparadora(
        pagina1.ctx,
        y
      );

      y += 22;


      escribirLinea(
        pagina1.ctx,
        "VENTA DE EQUIPOS",
        40,
        y,
        {
          tamano: 18,
          peso: 800,
        }
      );

      y += 31;


      let cantidadPagina1 =
        0;


      if (
        ventasEquipo.length ===
        0
      ) {
        escribirLinea(
          pagina1.ctx,
          "No se registraron ventas de equipos en este cierre.",
          55,
          y,
          {
            tamano: 13,
            color: "#667085",
          }
        );

        y += 28;
      } else {
        for (
          let indice = 0;
          indice <
          ventasEquipo.length;
          indice += 1
        ) {
          const item =
            ventasEquipo[
              indice
            ];

          const altoNecesario =
            altoVentaEquipo(
              item
            );

          /*
            Si no entra completo, se pasa íntegramente
            a la segunda imagen.
          */
          if (
            y +
              altoNecesario >
            LIMITE_CONTENIDO
          ) {
            break;
          }

          y =
            dibujarVentaEquipo({
              ctx:
                pagina1.ctx,
              item,
              indice,
              y,
            });

          cantidadPagina1 +=
            1;
        }
      }


      const ventasPagina2 =
        ventasEquipo.slice(
          cantidadPagina1
        );

      const totalPaginas =
        ventasPagina2.length >
        0
          ? 2
          : 1;


      piePagina({
        ctx:
          pagina1.ctx,
        ancho:
          pagina1.ancho,
        alto:
          pagina1.alto,
        pagina: 1,
        totalPaginas,
      });


      const baseNombre =
        `cierre-${control.tiendaNombre || cierre.tiendaId}-${fechaArchivo(
          cierre.fechaCierre
        )}`;


      if (
        totalPaginas ===
        1
      ) {
        descargarCanvas(
          pagina1.canvas,
          `${baseNombre}.png`
        );

        return;
      }


      /*
        SEGUNDA PÁGINA:
        solo se crea cuando realmente quedó contenido pendiente.
        Su altura se adapta para que ninguna venta quede cortada.
      */
      const altoPagina2 =
        Math.max(
          720,
          210 +
            ventasPagina2.reduce(
              (
                total,
                item
              ) =>
                total +
                altoVentaEquipo(
                  item
                ),
              0
            )
        );

      const pagina2 =
        prepararCanvas({
          ancho: 980,
          alto:
            altoPagina2,
        });

      let y2 =
        dibujarEncabezado({
          ctx:
            pagina2.ctx,
          control,
          cierre,
          continuacion:
            true,
        });


      escribirLinea(
        pagina2.ctx,
        "VENTA DE EQUIPOS · CONTINUACIÓN",
        40,
        y2,
        {
          tamano: 18,
          peso: 800,
        }
      );

      y2 += 32;


      ventasPagina2.forEach(
        (
          item,
          indiceLocal
        ) => {
          const indiceReal =
            cantidadPagina1 +
            indiceLocal;

          y2 =
            dibujarVentaEquipo({
              ctx:
                pagina2.ctx,
              item,
              indice:
                indiceReal,
              y:
                y2,
            });
        }
      );


      piePagina({
        ctx:
          pagina2.ctx,
        ancho:
          pagina2.ancho,
        alto:
          pagina2.alto,
        pagina: 2,
        totalPaginas: 2,
      });


      /*
        Se descargan dos PNG consecutivos.
        El pequeño retraso ayuda a que el navegador no ignore
        la segunda descarga en algunos equipos.
      */
      descargarCanvas(
        pagina1.canvas,
        `${baseNombre}-1.png`
      );

      window.setTimeout(
        () => {
          descargarCanvas(
            pagina2.canvas,
            `${baseNombre}-2.png`
          );
        },
        180
      );
    } catch (
      errorDescarga
    ) {
      window.alert(
        errorDescarga.message ||
          "No se pudo generar la imagen del cierre."
      );
    } finally {
      setDescargandoId(
        null
      );
    }
  }

  async function descargarControlEquipos(
    cierre
  ) {
    try {
      setDescargandoId(
        `equipos-${cierre.id}`
      );

      const datos =
        await obtenerDatosDescargaCierre(
          cierre.id
        );

      const control =
        datos.controlEquipos ||
        {};

      const ingresos =
        control.ingresos ||
        [];

      const salidas =
        control.salidas ||
        [];

      const ventas =
        control.ventasEquipo ||
        [];

      const stock =
        control.stockActual ||
        [];

      const filas =
        ingresos.length +
        salidas.length +
        ventas.length;

      const alto =
        Math.max(
          900,
          650 +
            filas * 72
        );

      const {
        canvas,
        ctx,
        ancho,
      } =
        prepararCanvas({
          ancho: 980,
          alto,
        });

      let y = 34;

      escribirLinea(
        ctx,
        `TIENDA ${String(control.tiendaNombre || nombreTienda(cierre.tiendaId)).toUpperCase()} (${fechaArchivo(cierre.fechaCierre)})`,
        40,
        y,
        {
          tamano: 24,
          peso: 800,
        }
      );

      y += 50;

      [
        ["Apertura", control.stockInicial || 0],
        ["Ingreso", ingresos.length],
        ["Salida", salidas.length],
        ["Venta", ventas.length],
        ["Stock", stock.length],
      ].forEach(
        ([etiqueta, valor]) => {
          escribirLinea(
            ctx,
            `${etiqueta}: ${valor}`,
            50,
            y,
            {
              tamano: 16,
              peso:
                etiqueta ===
                "Stock"
                  ? 800
                  : 500,
            }
          );

          y += 28;
        }
      );

      const dibujarLista = (
        titulo,
        items,
        formatear
      ) => {
        y += 12;

        lineaSeparadora(
          ctx,
          y
        );

        y += 18;

        escribirLinea(
          ctx,
          titulo,
          40,
          y,
          {
            tamano: 17,
            peso: 800,
          }
        );

        y += 30;

        if (
          items.length ===
          0
        ) {
          escribirLinea(
            ctx,
            "Sin registros.",
            55,
            y,
            {
              tamano: 13,
              color: "#667085",
            }
          );

          y += 27;
          return;
        }

        items.forEach(
          (item, indice) => {
            const lineas =
              formatear(
                item,
                indice
              );

            lineas.forEach(
              (
                linea,
                lineaIndex
              ) => {
                escribirLinea(
                  ctx,
                  linea,
                  55,
                  y,
                  {
                    tamano:
                      lineaIndex ===
                      0
                        ? 14
                        : 12,
                    peso:
                      lineaIndex ===
                      0
                        ? 700
                        : 400,
                    color:
                      lineaIndex ===
                      0
                        ? "#101828"
                        : "#667085",
                    maxWidth:
                      860,
                  }
                );

                y +=
                  lineaIndex ===
                  0
                    ? 22
                    : 19;
              }
            );

            y += 10;
          }
        );
      };

      dibujarLista(
        "EQUIPOS QUE LLEGARON",
        ingresos,
        (item, indice) => [
          `${indice + 1}. ${item.nombre || "Equipo"}`,
          `IMEI: ${item.imei || "-"}`,
          `Origen: ${item.origen || "-"}`,
        ]
      );

      dibujarLista(
        "EQUIPOS QUE SALIERON",
        salidas,
        (item, indice) => [
          `${indice + 1}. ${item.nombre || "Equipo"}`,
          `IMEI: ${item.imei || "-"}`,
          `Destino: ${item.destino || "-"}`,
        ]
      );

      dibujarLista(
        "EQUIPOS VENDIDOS",
        ventas,
        (item, indice) => {
          const lineas = [
            `${indice + 1}. ${item.nombre || "Equipo"}`,
            `IMEI: ${item.imei || "-"}`,
            `Modalidad: ${
              item.modalidadVenta === "financiado"
                ? "FINANCIADO"
                : item.modalidadVenta === "contado"
                ? "CONTADO"
                : "NO REGISTRADO"
            }`,
          ];

          if (
            item.financiado
          ) {
            lineas.push(
              `Bono: ${moneda.format(Number(item.bonoFinanciamiento || 0))}`
            );
          }

          return lineas;
        }
      );

      escribirLinea(
        ctx,
        "Priser Technology",
        ancho - 190,
        alto - 34,
        {
          tamano: 11,
          color: "#98a2b3",
        }
      );

      descargarCanvas(
        canvas,
        `equipos-${control.tiendaNombre || cierre.tiendaId}-${fechaArchivo(cierre.fechaCierre)}.png`
      );
    } catch (
      errorDescarga
    ) {
      window.alert(
        errorDescarga.message ||
          "No se pudo generar la imagen de equipos."
      );
    } finally {
      setDescargandoId(
        null
      );
    }
  }


  function miniConteo(
    clave,
    etiqueta,
    valor
  ) {
    const cantidad =
      Number(
        conteoEditando[
          clave
        ] || 0
      );

    return (
      <div className="cierres-mini-count">

        <span>
          {etiqueta}
        </span>

        <input
          type="number"
          min="0"
          step="1"
          inputMode="numeric"
          value={
            conteoEditando[
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
            cantidad *
              valor
          )}
        </strong>

      </div>
    );
  }


  return (
    <div className="cierres-page">

      <div className="cierres-header">
        <div>
          <h1>
            Cierres
          </h1>

          <p>
            Historial de cierres de caja. Una misma tienda puede tener varios cierres el mismo día.
          </p>
        </div>
      </div>


      <section className="cierres-summary">

        <article>
          <Store size={20} />
          <span>Cierres registrados</span>

          <strong>
            {resumen.cantidad}
          </strong>
        </article>


        <article>
          <span>
            Caja esperada
          </span>

          <strong>
            {moneda.format(
              resumen.esperado
            )}
          </strong>
        </article>


        <article>
          <Coins size={20} />

          <span>
            Efectivo contado
          </span>

          <strong>
            {moneda.format(
              resumen.contado
            )}
          </strong>
        </article>


        <article>
          <span>
            Diferencia acumulada
          </span>

          <strong
            className={
              resumen.diferencia < 0
                ? "cierres-negative"
                : resumen.diferencia > 0
                ? "cierres-positive"
                : ""
            }
          >
            {moneda.format(
              resumen.diferencia
            )}
          </strong>
        </article>

      </section>


      <section className="cierres-toolbar">

        <div className="cierres-search">
          <Search size={17} />

          <input
            type="text"
            placeholder="Buscar tienda, cierre u observación..."
            value={busqueda}
            onChange={(event) =>
              setBusqueda(
                event.target.value
              )
            }
          />
        </div>


        <label className="cierres-date">
          <CalendarDays size={16} />

          <span>
            Desde
          </span>

          <input
            type="date"
            value={fechaDesde}
            onChange={(event) =>
              setFechaDesde(
                event.target.value
              )
            }
          />
        </label>


        <label className="cierres-date">
          <CalendarDays size={16} />

          <span>
            Hasta
          </span>

          <input
            type="date"
            value={fechaHasta}
            onChange={(event) =>
              setFechaHasta(
                event.target.value
              )
            }
          />
        </label>

      </section>


      {esSuperAdmin &&
        cajasAbiertasAnteriores.length >
          0 && (

        <section className="cierres-old-open">

          <div className="cierres-old-open__header">
            <div>
              <h2>
                Cajas abiertas de días anteriores
              </h2>

              <p>
                El botón Eliminar solo aparece durante los 2 días posteriores a la apertura.
              </p>
            </div>
          </div>


          <div className="cierres-old-open__list">

            {cajasAbiertasAnteriores.map(
              (caja) => {
                const dias =
                  diasAntiguedad(
                    caja.fechaApertura
                  );

                return (
                  <div
                    className="cierres-old-open__row"
                    key={
                      caja.id
                    }
                  >

                    <strong className="cierres-old-open__store">
                      {nombreTienda(
                        caja.tiendaId
                      )}
                    </strong>

                    <span>
                      {fechaTexto(
                        caja.fechaApertura
                      )}
                    </span>

                    <span>
                      Inicial:{" "}
                      <b>
                        {moneda.format(
                          Number(
                            caja.cajaInicial ||
                              0
                          )
                        )}
                      </b>
                    </span>

                    <span>
                      {dias} día
                      {dias === 1
                        ? ""
                        : "s"}
                    </span>

                    <div className="cierres-old-open__action">
                      <button
                        type="button"
                        className="cierres-old-open__delete"
                        onClick={() =>
                          eliminarCajaAnterior(
                            caja
                          )
                        }
                        disabled={
                          eliminandoCajaId ===
                          caja.id
                        }
                      >
                        <Trash2
                          size={14}
                        />

                        {eliminandoCajaId ===
                        caja.id
                          ? "Eliminando..."
                          : "Eliminar"}
                      </button>
                    </div>

                  </div>
                );
              }
            )}

          </div>

        </section>

      )}


      <section className="cierres-table-card">

        <div className="cierres-table-scroll">

          <table className="cierres-table">

            <thead>
              <tr>
                <th>Cierre</th>
                <th>Fecha</th>
                <th>Tienda</th>
                <th>Descargas</th>
                <th>Inicial</th>
                <th>Ventas efectivo</th>
                <th>Ingresos efectivo</th>
                <th>Gastos efectivo</th>
                <th>Retiros efectivo</th>
                <th>Esperado</th>
                <th>Contado</th>
                <th>Diferencia</th>
                <th>Arqueo</th>
                <th>Registro</th>
                <th>Billetes</th>
                <th>Monedas</th>
                <th>Observación</th>

                {puedeGestionarCierres && (
                  <th>
                    Acciones
                  </th>
                )}
              </tr>
            </thead>


            <tbody>

              {cierresFiltrados.length ===
              0 ? (

                <tr>
                  <td
                    colSpan={
                      puedeGestionarCierres
                        ? "18"
                        : "17"
                    }
                  >
                    <div className="cierres-empty">
                      No hay cierres registrados.
                    </div>
                  </td>
                </tr>

              ) : (

                cierresFiltrados.map(
                  (cierre) => {
                    const estado =
                      estadoDinero(
                        cierre.diferencia
                      );

                    const reabierto =
                      cierre.estado ===
                      "reabierto";

                    return (
                      <tr
                        key={
                          cierre.id
                        }
                        className={
                          reabierto
                            ? "cierres-row--reabierto"
                            : ""
                        }
                      >

                        <td>
                          <strong>
                            #{cierre.numeroCierre ||
                              "-"}
                          </strong>
                        </td>


                        <td>
                          {fechaTexto(
                            cierre.fechaCierre
                          )}
                        </td>


                        <td>
                          <strong>
                            {nombreTienda(
                              cierre.tiendaId
                            )}
                          </strong>
                        </td>


                        <td>
                          <div className="cierres-downloads-visible">
                            <button
                              type="button"
                              onClick={() =>
                                descargarResumenCierre(
                                  cierre
                                )
                              }
                              disabled={
                                descargandoId ===
                                `resumen-${cierre.id}`
                              }
                              title="Descargar cierre de caja en PNG"
                            >
                              <Download size={13} />
                              {descargandoId ===
                              `resumen-${cierre.id}`
                                ? "..."
                                : "Caja"}
                            </button>

                            <button
                              type="button"
                              onClick={() =>
                                descargarControlEquipos(
                                  cierre
                                )
                              }
                              disabled={
                                descargandoId ===
                                `equipos-${cierre.id}`
                              }
                              title="Descargar control de equipos en PNG"
                            >
                              <Download size={13} />
                              {descargandoId ===
                              `equipos-${cierre.id}`
                                ? "..."
                                : "Equipos"}
                            </button>
                          </div>
                        </td>


                        <td>
                          {moneda.format(
                            Number(
                              cierre.cajaInicial ||
                                0
                            )
                          )}
                        </td>


                        <td>
                          {moneda.format(
                            Number(
                              cierre.ventas ||
                                0
                            )
                          )}
                        </td>


                        <td>
                          {moneda.format(
                            Number(
                              cierre.ingresos ||
                                0
                            )
                          )}
                        </td>


                        <td>
                          {moneda.format(
                            Number(
                              cierre.gastos ||
                                0
                            )
                          )}
                        </td>


                        <td>
                          {moneda.format(
                            Number(
                              cierre.retiros ||
                                0
                            )
                          )}
                        </td>


                        <td>
                          <strong>
                            {moneda.format(
                              Number(
                                cierre.cajaEsperada ||
                                  0
                              )
                            )}
                          </strong>
                        </td>


                        <td>
                          <strong>
                            {moneda.format(
                              Number(
                                cierre.efectivoContado ||
                                  0
                              )
                            )}
                          </strong>
                        </td>


                        <td>
                          <strong
                            className={
                              Number(
                                cierre.diferencia ||
                                  0
                              ) < 0
                                ? "cierres-negative"
                                : Number(
                                    cierre.diferencia ||
                                      0
                                  ) > 0
                                ? "cierres-positive"
                                : ""
                            }
                          >
                            {moneda.format(
                              Number(
                                cierre.diferencia ||
                                  0
                              )
                            )}
                          </strong>
                        </td>


                        <td>
                          <span
                            className={`cierres-status cierres-status--${estado.tipo}`}
                          >
                            {estado.texto}
                          </span>
                        </td>


                        <td>
                          <span
                            className={
                              reabierto
                                ? "cierres-record cierres-record--reabierto"
                                : "cierres-record cierres-record--cerrado"
                            }
                          >
                            {reabierto
                              ? "Reabierto"
                              : "Cerrado"}
                          </span>
                        </td>


                        <td>
                          {moneda.format(
                            Number(
                              cierre.totalBilletes ||
                                0
                            )
                          )}
                        </td>


                        <td>
                          {moneda.format(
                            Number(
                              cierre.totalMonedas ||
                                0
                            )
                          )}
                        </td>


                        <td className="cierres-observacion">
                          {cierre.observacion ||
                            "-"}
                        </td>


                        {puedeGestionarCierres && (
                          <td>
                            <div className="cierres-actions">

                              {esAdministrador && (
                                <button
                                  type="button"
                                  className="cierres-action cierres-action--edit"
                                  onClick={() =>
                                    abrirEdicion(
                                      cierre
                                    )
                                  }
                                  disabled={
                                    guardando ||
                                    reabierto
                                  }
                                  title={
                                    reabierto
                                      ? "Este cierre ya fue reabierto"
                                      : "Editar arqueo"
                                  }
                                >
                                  <Pencil
                                    size={14}
                                  />

                                  Editar
                                </button>
                              )}


                              {esSuperAdmin && (
                                <button
                                  type="button"
                                  className="cierres-action cierres-action--delete"
                                  onClick={() =>
                                    eliminarCierre(
                                      cierre
                                    )
                                  }
                                  disabled={
                                    guardando ||
                                    eliminandoCierreId ===
                                      cierre.id
                                  }
                                  title="Eliminar cierre definitivamente"
                                >
                                  <Trash2
                                    size={14}
                                  />

                                  {eliminandoCierreId ===
                                  cierre.id
                                    ? "Eliminando..."
                                    : "Eliminar"}
                                </button>
                              )}


                              <button
                                type="button"
                                className="cierres-action cierres-action--reopen"
                                onClick={() =>
                                  reabrir(
                                    cierre
                                  )
                                }
                                disabled={
                                  guardando ||
                                  reabierto ||
                                  !puedeReabrir(
                                    cierre
                                  )
                                }
                                title={
                                  reabierto
                                    ? "Este cierre ya fue reabierto"
                                    : !puedeReabrir(
                                        cierre
                                      )
                                    ? "Caja de un día anterior: solo un administrador puede reabrirla"
                                    : "Reabrir caja"
                                }
                              >
                                <RotateCcw
                                  size={14}
                                />

                                Reabrir
                              </button>

                            </div>
                          </td>
                        )}

                      </tr>
                    );
                  }
                )

              )}

            </tbody>

          </table>

        </div>

      </section>


      {cierreEditando && (

        <div className="cierres-modal-overlay">

          <div className="cierres-modal">

            <div className="cierres-modal__header">

              <div>
                <h2>
                  Editar cierre #{cierreEditando.numeroCierre || "-"}
                </h2>

                <p>
                  {nombreTienda(
                    cierreEditando.tiendaId
                  )} · {fechaTexto(
                    cierreEditando.fechaCierre
                  )}
                </p>
              </div>


              <button
                type="button"
                onClick={
                  cerrarEdicion
                }
                disabled={
                  guardando
                }
              >
                <X size={20} />
              </button>

            </div>


            <form
              className="cierres-edit-form"
              onSubmit={
                guardarEdicion
              }
            >

              <div className="cierres-edit-summary">

                <div>
                  <span>
                    Caja esperada
                  </span>

                  <strong>
                    {moneda.format(
                      Number(
                        cierreEditando.cajaEsperada ||
                          0
                      )
                    )}
                  </strong>
                </div>


                <div>
                  <span>
                    Nuevo contado
                  </span>

                  <strong>
                    {moneda.format(
                      totalEditando
                    )}
                  </strong>
                </div>


                <div>
                  <span>
                    Nueva diferencia
                  </span>

                  <strong
                    className={
                      diferenciaEditando < 0
                        ? "cierres-negative"
                        : diferenciaEditando > 0
                        ? "cierres-positive"
                        : ""
                    }
                  >
                    {moneda.format(
                      diferenciaEditando
                    )}
                  </strong>
                </div>

              </div>


              <section className="cierres-edit-section">
                <h3>
                  Billetes
                </h3>

                <div className="cierres-edit-grid">
                  {miniConteo(
                    "b200",
                    "S/ 200",
                    200
                  )}

                  {miniConteo(
                    "b100",
                    "S/ 100",
                    100
                  )}

                  {miniConteo(
                    "b50",
                    "S/ 50",
                    50
                  )}

                  {miniConteo(
                    "b20",
                    "S/ 20",
                    20
                  )}

                  {miniConteo(
                    "b10",
                    "S/ 10",
                    10
                  )}
                </div>
              </section>


              <section className="cierres-edit-section">
                <h3>
                  Monedas
                </h3>

                <div className="cierres-edit-grid">
                  {miniConteo(
                    "m5",
                    "S/ 5",
                    5
                  )}

                  {miniConteo(
                    "m2",
                    "S/ 2",
                    2
                  )}

                  {miniConteo(
                    "m1",
                    "S/ 1",
                    1
                  )}

                  {miniConteo(
                    "c50",
                    "50 cént.",
                    0.5
                  )}

                  {miniConteo(
                    "c20",
                    "20 cént.",
                    0.2
                  )}

                  {miniConteo(
                    "c10",
                    "10 cént.",
                    0.1
                  )}
                </div>
              </section>


              <label>
                Observación

                <textarea
                  rows="3"
                  value={
                    observacionEditando
                  }
                  onChange={(event) =>
                    setObservacionEditando(
                      event.target.value
                    )
                  }
                  placeholder="Observación del cierre..."
                />
              </label>


              {error && (
                <div className="cierres-error">
                  {error}
                </div>
              )}


              <div className="cierres-edit-actions">

                <button
                  type="button"
                  className="cierres-cancel"
                  onClick={
                    cerrarEdicion
                  }
                  disabled={
                    guardando
                  }
                >
                  Cancelar
                </button>


                <button
                  type="submit"
                  className="cierres-save"
                  disabled={
                    guardando
                  }
                >
                  {guardando
                    ? "Guardando..."
                    : "Guardar cambios"}
                </button>

              </div>

            </form>

          </div>

        </div>

      )}

    </div>
  );
}


export default Cierres;
  