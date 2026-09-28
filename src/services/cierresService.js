import {
  collection,
  deleteField,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  query,
  serverTimestamp,
  where,
  writeBatch,
} from "firebase/firestore";

import {
  auth,
  db,
} from "../firebase/firebaseConfig";

import {
  obtenerCajaAbierta,
  obtenerResumenCaja,
} from "./cajaService";


export const DENOMINACIONES_CAJA = [
  { clave: "b200", etiqueta: "S/ 200", valor: 200, tipo: "billete" },
  { clave: "b100", etiqueta: "S/ 100", valor: 100, tipo: "billete" },
  { clave: "b50", etiqueta: "S/ 50", valor: 50, tipo: "billete" },
  { clave: "b20", etiqueta: "S/ 20", valor: 20, tipo: "billete" },
  { clave: "b10", etiqueta: "S/ 10", valor: 10, tipo: "billete" },

  { clave: "m5", etiqueta: "S/ 5", valor: 5, tipo: "moneda" },
  { clave: "m2", etiqueta: "S/ 2", valor: 2, tipo: "moneda" },
  { clave: "m1", etiqueta: "S/ 1", valor: 1, tipo: "moneda" },
  { clave: "c50", etiqueta: "50 céntimos", valor: 0.5, tipo: "centimo" },
  { clave: "c20", etiqueta: "20 céntimos", valor: 0.2, tipo: "centimo" },
  { clave: "c10", etiqueta: "10 céntimos", valor: 0.1, tipo: "centimo" },
];


function numero(valor) {
  const convertido = Number(valor);

  return Number.isFinite(convertido)
    ? convertido
    : 0;
}


function fechaMs(fecha) {
  if (!fecha) {
    return 0;
  }

  if (
    typeof fecha.toDate ===
    "function"
  ) {
    return fecha.toDate().getTime();
  }

  const convertida =
    new Date(fecha);

  return Number.isNaN(
    convertida.getTime()
  )
    ? 0
    : convertida.getTime();
}


function fechaPeruClave(
  valor
) {
  if (!valor) {
    return "";
  }

  const fecha =
    typeof valor.toDate ===
    "function"
      ? valor.toDate()
      : new Date(valor);

  if (
    Number.isNaN(
      fecha.getTime()
    )
  ) {
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
      fecha
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


function esMismoDiaPeru(
  fechaA,
  fechaB = new Date()
) {
  const a =
    fechaPeruClave(
      fechaA
    );

  const b =
    fechaPeruClave(
      fechaB
    );

  return (
    Boolean(a) &&
    a === b
  );
}


function esCajaAbiertaAnterior(
  caja
) {
  if (
    !caja ||
    caja.estado !==
      "abierta"
  ) {
    return false;
  }

  /*
    Si no tiene fecha de apertura también la mostramos al
    Super Admin para poder limpiar registros antiguos
    o incompletos.
  */
  if (!caja.fechaApertura) {
    return true;
  }

  return !esMismoDiaPeru(
    caja.fechaApertura
  );
}


function diasDesdeAperturaPeru(
  fechaApertura
) {
  const clave =
    fechaPeruClave(
      fechaApertura
    );

  if (!clave) {
    return 9999;
  }

  const hoyClave =
    fechaPeruClave(
      new Date()
    );

  const inicio =
    new Date(
      `${clave}T00:00:00-05:00`
    );

  const hoy =
    new Date(
      `${hoyClave}T00:00:00-05:00`
    );

  return Math.floor(
    (
      hoy.getTime() -
      inicio.getTime()
    ) /
      86400000
  );
}


export function puedeEliminarCajaAnterior(
  caja
) {
  if (
    !caja ||
    caja.estado !==
      "abierta"
  ) {
    return false;
  }

  const dias =
    diasDesdeAperturaPeru(
      caja.fechaApertura
    );

  return (
    dias >= 1 &&
    dias <= 2
  );
}


async function obtenerPerfilActual() {
  const uid =
    auth.currentUser?.uid;

  if (!uid) {
    throw new Error(
      "Debes iniciar sesión."
    );
  }

  const perfilSnap =
    await getDoc(
      doc(
        db,
        "usuarios",
        uid
      )
    );

  if (
    !perfilSnap.exists()
  ) {
    throw new Error(
      "No se encontró tu perfil de usuario."
    );
  }

  return {
    uid,

    ...perfilSnap.data(),
  };
}


function rolNormalizado(
  perfil
) {
  return String(
    perfil?.rol || ""
  )
    .trim()
    .toLowerCase();
}


function esAdministrador(
  perfil
) {
  const rol =
    rolNormalizado(
      perfil
    );

  return (
    perfil?.superAdmin ===
      true ||
    rol ===
      "administrador" ||
    rol ===
      "admin"
  );
}


function esVendedor(
  perfil
) {
  return (
    rolNormalizado(
      perfil
    ) ===
    "vendedor"
  );
}


export function crearConteoEfectivoVacio() {
  return DENOMINACIONES_CAJA.reduce(
    (resultado, denominacion) => {
      resultado[
        denominacion.clave
      ] = 0;

      return resultado;
    },
    {}
  );
}


export function calcularTotalConteo(
  conteo = {}
) {
  return DENOMINACIONES_CAJA.reduce(
    (total, denominacion) => {
      const cantidad =
        Math.max(
          0,
          Math.trunc(
            numero(
              conteo[
                denominacion.clave
              ]
            )
          )
        );

      return (
        total +
        cantidad *
          denominacion.valor
      );
    },
    0
  );
}


function normalizarConteo(
  conteo = {}
) {
  return DENOMINACIONES_CAJA.reduce(
    (resultado, denominacion) => {
      resultado[
        denominacion.clave
      ] =
        Math.max(
          0,
          Math.trunc(
            numero(
              conteo[
                denominacion.clave
              ]
            )
          )
        );

      return resultado;
    },
    {}
  );
}


function crearDesglose(
  conteo
) {
  return DENOMINACIONES_CAJA.map(
    (denominacion) => {
      const cantidad =
        conteo[
          denominacion.clave
        ] || 0;

      return {
        clave:
          denominacion.clave,

        etiqueta:
          denominacion.etiqueta,

        tipo:
          denominacion.tipo,

        valorUnitario:
          denominacion.valor,

        cantidad,

        subtotal:
          cantidad *
          denominacion.valor,
      };
    }
  );
}


function totalesConteo(
  conteo
) {
  const desglose =
    crearDesglose(
      conteo
    );

  const totalBilletes =
    desglose
      .filter(
        (item) =>
          item.tipo ===
          "billete"
      )
      .reduce(
        (total, item) =>
          total +
          item.subtotal,
        0
      );

  const totalMonedas =
    desglose
      .filter(
        (item) =>
          item.tipo !==
          "billete"
      )
      .reduce(
        (total, item) =>
          total +
          item.subtotal,
        0
      );

  return {
    desglose,
    totalBilletes,
    totalMonedas,
  };
}


async function siguienteNumeroCierre(
  cajaId,
  tiendaId
) {
  const snapshot =
    await getDocs(
      query(
        collection(
          db,
          "cierresCaja"
        ),
        where(
          "tiendaId",
          "==",
          tiendaId
        )
      )
    );

  const cantidad =
    snapshot.docs.filter(
      (documento) =>
        documento.data()
          .cajaId ===
        cajaId
    ).length;

  return cantidad + 1;
}


function movimientoRegistroValido(
  item
) {
  return ![
    "anulada",
    "anulado",
    "eliminada",
    "eliminado",
    "cancelada",
    "cancelado",
  ].includes(
    String(
      item?.estado || ""
    )
      .trim()
      .toLowerCase()
  );
}


function mismoDiaPeru(
  fechaA,
  fechaB
) {
  const a =
    fechaPeruClave(
      fechaA
    );

  const b =
    fechaPeruClave(
      fechaB
    );

  return (
    Boolean(a) &&
    a === b
  );
}


function nombreEquipo(
  equipo = {}
) {
  return [
    equipo.marca,
    equipo.modelo,
    equipo.ram
      ? `${equipo.ram}GB`
      : "",
    equipo.almacenamiento
      ? `${equipo.almacenamiento}GB`
      : "",
  ]
    .filter(Boolean)
    .join(" ");
}


async function obtenerControlEquiposDia({
  tiendaId,
  fechaReferencia,
}) {
  const [
    ventasSnap,
    movimientosOrigenSnap,
    movimientosDestinoSnap,
    equiposSnap,
    tiendasSnap,
  ] = await Promise.all([
    getDocs(
      query(
        collection(
          db,
          "ventas"
        ),
        where(
          "tiendaId",
          "==",
          tiendaId
        )
      )
    ),

    getDocs(
      query(
        collection(
          db,
          "movimientosEquipos"
        ),
        where(
          "origenTiendaId",
          "==",
          tiendaId
        )
      )
    ),

    getDocs(
      query(
        collection(
          db,
          "movimientosEquipos"
        ),
        where(
          "destinoTiendaId",
          "==",
          tiendaId
        )
      )
    ),

    getDocs(
      collection(
        db,
        "equipos"
      )
    ),

    getDocs(
      collection(
        db,
        "tiendas"
      )
    ),
  ]);

  const ventas =
    ventasSnap.docs
      .map(
        (documento) => ({
          id:
            documento.id,
          ...documento.data(),
        })
      )
      .filter(
        (venta) =>
          movimientoRegistroValido(
            venta
          ) &&
          mismoDiaPeru(
            venta.fecha,
            fechaReferencia
          )
      );

  const movimientosOrigen =
    movimientosOrigenSnap.docs
      .map(
        (documento) => ({
          id:
            documento.id,
          ...documento.data(),
        })
      )
      .filter(
        (movimiento) =>
          movimientoRegistroValido(
            movimiento
          ) &&
          mismoDiaPeru(
            movimiento.fecha,
            fechaReferencia
          )
      );

  const movimientosDestino =
    movimientosDestinoSnap.docs
      .map(
        (documento) => ({
          id:
            documento.id,
          ...documento.data(),
        })
      )
      .filter(
        (movimiento) =>
          movimientoRegistroValido(
            movimiento
          ) &&
          mismoDiaPeru(
            movimiento.fecha,
            fechaReferencia
          )
      );

  const equipos =
    equiposSnap.docs.map(
      (documento) => ({
        id:
          documento.id,
        ...documento.data(),
      })
    );

  const tiendas =
    tiendasSnap.docs.map(
      (documento) => ({
        id:
          documento.id,
        ...documento.data(),
      })
    );

  const nombresTiendas =
    Object.fromEntries(
      tiendas.map(
        (tienda) => [
          tienda.id,
          tienda.nombre ||
            tienda.id?.toUpperCase(),
        ]
      )
    );

  const mapaEquipos =
    Object.fromEntries(
      equipos.map(
        (equipo) => [
          equipo.id,
          equipo,
        ]
      )
    );

  const ingresos =
    movimientosDestino
      .filter(
        (movimiento) =>
          String(
            movimiento.tipo || ""
          )
            .toLowerCase() ===
          "transferencia"
      )
      .map(
        (movimiento) => {
          const equipo =
            mapaEquipos[
              movimiento.equipoId
            ] || {};

          return {
            id:
              movimiento.id,
            equipoId:
              movimiento.equipoId ||
              "",
            nombre:
              nombreEquipo(
                equipo
              ) ||
              movimiento.descripcion ||
              "Equipo",
            imei:
              equipo.imei ||
              movimiento.imei ||
              "",
            origenTiendaId:
              movimiento.origenTiendaId ||
              "",
            origen:
              nombresTiendas[
                movimiento.origenTiendaId
              ] ||
              movimiento.origenTiendaId ||
              "-",
          };
        }
      );

  const salidas =
    movimientosOrigen
      .filter(
        (movimiento) =>
          String(
            movimiento.tipo || ""
          )
            .toLowerCase() ===
          "transferencia"
      )
      .map(
        (movimiento) => {
          const equipo =
            mapaEquipos[
              movimiento.equipoId
            ] || {};

          return {
            id:
              movimiento.id,
            equipoId:
              movimiento.equipoId ||
              "",
            nombre:
              nombreEquipo(
                equipo
              ) ||
              movimiento.descripcion ||
              "Equipo",
            imei:
              equipo.imei ||
              movimiento.imei ||
              "",
            destinoTiendaId:
              movimiento.destinoTiendaId ||
              "",
            destino:
              nombresTiendas[
                movimiento.destinoTiendaId
              ] ||
              movimiento.destinoTiendaId ||
              "-",
          };
        }
      );

  const ventasEquipo =
    ventas
      .filter(
        (venta) =>
          venta.tipoVenta ===
          "equipo"
      )
      .map(
        (venta) => {
          const equipo =
            mapaEquipos[
              venta.equipoId
            ] || {};

          const modalidadGuardada =
            String(
              venta.modalidadVenta ||
                venta.tipoFinanciamiento ||
                ""
            )
              .trim()
              .toLowerCase();

          const modalidadVenta =
            ["contado", "financiado"].includes(
              modalidadGuardada
            )
              ? modalidadGuardada
              : venta.esFinanciado === true
              ? "financiado"
              : venta.esFinanciado === false
              ? "contado"
              : "";

          const financiado =
            modalidadVenta ===
            "financiado";

          return {
            id:
              venta.id,
            equipoId:
              venta.equipoId ||
              "",
            nombre:
              venta.nombreEquipo ||
              venta.descripcion ||
              nombreEquipo(
                equipo
              ) ||
              "Equipo",
            imei:
              venta.imei ||
              equipo.imei ||
              "",
            monto:
              numero(
                venta.monto
              ),
            financiado,
            modalidadVenta,
            bonoFinanciamiento:
              financiado
                ? numero(
                    venta.bonoFinanciamiento
                  )
                : 0,
          };
        }
      );

  const stockActual =
    equipos
      .filter(
        (equipo) =>
          equipo.activo !==
            false &&
          equipo.estado !==
            "vendido" &&
          equipo.ubicacionActual ===
            tiendaId
      )
      .map(
        (equipo) => ({
          id:
            equipo.id,
          nombre:
            nombreEquipo(
              equipo
            ) ||
            "Equipo",
          imei:
            equipo.imei ||
            "",
        })
      );

  const stockInicial =
    Math.max(
      0,
      stockActual.length -
        ingresos.length +
        salidas.length +
        ventasEquipo.length
    );

  const totalVentas =
    ventas.reduce(
      (total, venta) =>
        total +
        numero(
          venta.monto
        ),
      0
    );

  return {
    tiendaId,
    tiendaNombre:
      nombresTiendas[
        tiendaId
      ] ||
      tiendaId?.toUpperCase() ||
      "-",
    stockInicial,
    ingresos,
    salidas,
    ventasEquipo,
    stockActual,
    totalVentas,
    cantidadVentas:
      ventas.length,
  };
}


export async function cerrarCaja({
  tiendaId,
  efectivoContado,
  conteoEfectivo,
  observacion = "",
}) {
  if (
    !tiendaId ||
    tiendaId === "todas"
  ) {
    throw new Error(
      "Selecciona una tienda específica."
    );
  }

  const caja =
    await obtenerCajaAbierta(
      tiendaId
    );

  if (!caja) {
    throw new Error(
      "Esta tienda no tiene una caja abierta."
    );
  }

  const resumen =
    await obtenerResumenCaja(
      caja
    );

  if (!resumen) {
    throw new Error(
      "No se pudo calcular el resumen de caja."
    );
  }

  const conteoNormalizado =
    conteoEfectivo
      ? normalizarConteo(
          conteoEfectivo
        )
      : null;

  const contado =
    conteoNormalizado
      ? calcularTotalConteo(
          conteoNormalizado
        )
      : numero(
          efectivoContado
        );

  if (contado < 0) {
    throw new Error(
      "El efectivo contado no puede ser negativo."
    );
  }

  const diferencia =
    contado -
    resumen.cajaEsperada;

  const {
    desglose,
    totalBilletes,
    totalMonedas,
  } = conteoNormalizado
    ? totalesConteo(
        conteoNormalizado
      )
    : {
        desglose: [],
        totalBilletes: 0,
        totalMonedas: 0,
      };

  const numeroCierre =
    await siguienteNumeroCierre(
      caja.id,
      tiendaId
    );


  let controlEquipos = null;

  try {
    controlEquipos =
      await obtenerControlEquiposDia({
        tiendaId,
        fechaReferencia:
          new Date(),
      });
  } catch (
    errorControl
  ) {
    console.error(
      "No se pudo generar el snapshot de equipos del cierre:",
      errorControl
    );
  }

  const cierreRef =
    doc(
      collection(
        db,
        "cierresCaja"
      )
    );

  const cajaRef =
    doc(
      db,
      "cajas",
      caja.id
    );

  const cierre = {
    cajaId:
      caja.id,

    tiendaId,

    numeroCierre,

    cajaInicial:
      resumen.cajaInicial,

    /*
      Estos importes ya vienen del cajaService.
      La caja física solo considera movimientos en efectivo.
    */
    ventas:
      resumen.ventas,

    ingresos:
      resumen.ingresos,

    gastos:
      resumen.gastos,

    retiros:
      resumen.retiros,

    cajaEsperada:
      resumen.cajaEsperada,

    efectivoContado:
      contado,

    diferencia,

    conteoEfectivo:
      conteoNormalizado,

    desgloseEfectivo:
      desglose,

    totalBilletes,

    totalMonedas,

    controlEquipos,

    recargasSaldoInicial:
      numero(
        resumen.recargas?.saldoInicial
      ),

    recargasUsado:
      numero(
        resumen.recargas?.usado
      ),

    recargasSaldoActual:
      numero(
        resumen.recargas?.saldoActual
      ),

    recaudacionSaldoInicial:
      numero(
        resumen.recaudacion?.saldoInicial
      ),

    recaudacionUsado:
      numero(
        resumen.recaudacion?.usado
      ),

    recaudacionSaldoActual:
      numero(
        resumen.recaudacion?.saldoActual
      ),

    observacion:
      String(
        observacion || ""
      ).trim(),

    estado:
      "cerrado",

    fechaApertura:
      caja.fechaApertura ||
      null,

    fechaCierre:
      serverTimestamp(),

    cerradoPor:
      auth.currentUser?.uid ||
      null,
  };

  const batch =
    writeBatch(
      db
    );

  batch.set(
    cierreRef,
    cierre
  );

  batch.update(
    cajaRef,
    {
      estado:
        "cerrada",

      fechaCierre:
        serverTimestamp(),

      cajaEsperada:
        resumen.cajaEsperada,

      efectivoContado:
        contado,

      diferencia,

      conteoEfectivoCierre:
        conteoNormalizado,

      desgloseEfectivoCierre:
        desglose,

      totalBilletesCierre:
        totalBilletes,

      totalMonedasCierre:
        totalMonedas,

      cierreId:
        cierreRef.id,

      numeroCierreActual:
        numeroCierre,

      observacionCierre:
        cierre.observacion,

      cerradoPor:
        auth.currentUser?.uid ||
        null,
    }
  );

  await batch.commit();

  return {
    id:
      cierreRef.id,

    ...cierre,
  };
}


export async function editarCierre({
  cierreId,
  conteoEfectivo,
  observacion = "",
}) {
  if (!cierreId) {
    throw new Error(
      "No se encontró el cierre."
    );
  }

  const cierreRef =
    doc(
      db,
      "cierresCaja",
      cierreId
    );

  const cierreSnap =
    await getDoc(
      cierreRef
    );

  if (!cierreSnap.exists()) {
    throw new Error(
      "El cierre ya no existe."
    );
  }

  const cierre =
    cierreSnap.data();

  if (
    cierre.estado ===
    "reabierto"
  ) {
    throw new Error(
      "Este cierre ya fue reabierto. El registro anterior se conserva como historial."
    );
  }

  const conteo =
    normalizarConteo(
      conteoEfectivo ||
        cierre.conteoEfectivo ||
        {}
    );

  const efectivoContado =
    calcularTotalConteo(
      conteo
    );

  const cajaEsperada =
    numero(
      cierre.cajaEsperada
    );

  const diferencia =
    efectivoContado -
    cajaEsperada;

  const {
    desglose,
    totalBilletes,
    totalMonedas,
  } = totalesConteo(
    conteo
  );

  const cajaRef =
    doc(
      db,
      "cajas",
      cierre.cajaId
    );

  const cajaSnap =
    await getDoc(
      cajaRef
    );

  const batch =
    writeBatch(
      db
    );

  batch.update(
    cierreRef,
    {
      conteoEfectivo:
        conteo,

      desgloseEfectivo:
        desglose,

      totalBilletes,

      totalMonedas,

      efectivoContado,

      diferencia,

      observacion:
        String(
          observacion || ""
        ).trim(),

      fechaEdicion:
        serverTimestamp(),

      editadoPor:
        auth.currentUser?.uid ||
        null,
    }
  );

  /*
    Si este cierre sigue siendo el cierre vigente de la caja,
    sincronizamos también el documento de cajas.
    Si ya existe un cierre posterior, NO tocamos la caja.
  */
  if (
    cajaSnap.exists()
  ) {
    const caja =
      cajaSnap.data();

    if (
      caja.estado ===
        "cerrada" &&
      caja.cierreId ===
        cierreId
    ) {
      batch.update(
        cajaRef,
        {
          efectivoContado,

          diferencia,

          conteoEfectivoCierre:
            conteo,

          desgloseEfectivoCierre:
            desglose,

          totalBilletesCierre:
            totalBilletes,

          totalMonedasCierre:
            totalMonedas,

          observacionCierre:
            String(
              observacion || ""
            ).trim(),

          fechaActualizacionCierre:
            serverTimestamp(),

          actualizadoPor:
            auth.currentUser?.uid ||
            null,
        }
      );
    }
  }

  await batch.commit();
}


export async function reabrirCajaDesdeCierre(
  cierreId
) {
  if (!cierreId) {
    throw new Error(
      "No se encontró el cierre."
    );
  }

  const perfil =
    await obtenerPerfilActual();

  const administrador =
    esAdministrador(
      perfil
    );

  const vendedor =
    esVendedor(
      perfil
    );

  if (
    !administrador &&
    !vendedor
  ) {
    throw new Error(
      "Tu usuario no tiene permiso para reabrir cajas."
    );
  }

  const cierreRef =
    doc(
      db,
      "cierresCaja",
      cierreId
    );

  const cierreSnap =
    await getDoc(
      cierreRef
    );

  if (!cierreSnap.exists()) {
    throw new Error(
      "El cierre ya no existe."
    );
  }

  const cierre =
    cierreSnap.data();

  if (
    cierre.estado ===
    "reabierto"
  ) {
    throw new Error(
      "Este cierre ya fue reabierto."
    );
  }

  if (
    !cierre.cajaId ||
    !cierre.tiendaId
  ) {
    throw new Error(
      "El cierre no tiene una caja vinculada correctamente."
    );
  }

  const cajaRef =
    doc(
      db,
      "cajas",
      cierre.cajaId
    );

  const cajaSnap =
    await getDoc(
      cajaRef
    );

  if (!cajaSnap.exists()) {
    throw new Error(
      "La caja vinculada ya no existe."
    );
  }

  const caja =
    cajaSnap.data();

  /*
    Solo se puede reabrir el cierre vigente.
    Un cierre anterior queda como historial y no puede
    volver a convertirse en la caja activa.
  */
  if (
    caja.estado !==
      "cerrada" ||
    caja.cierreId !==
      cierreId
  ) {
    throw new Error(
      "Solo se puede reabrir el último cierre vigente de esta caja."
    );
  }

  /*
    REGLA DE NEGOCIO:
    - VENDEDOR: solo puede reabrir una caja si su FECHA DE
      APERTURA pertenece al día de hoy en Perú.
    - ADMINISTRADOR / SUPER ADMIN: puede reabrir una caja
      aunque haya sido abierta otro día.
  */
  const fechaApertura =
    cierre.fechaApertura ||
    caja.fechaApertura;

  const mismoDia =
    esMismoDiaPeru(
      fechaApertura
    );

  if (
    vendedor &&
    !administrador &&
    !mismoDia
  ) {
    throw new Error(
      "Esta caja fue abierta en un día anterior. Solo un administrador puede reabrirla."
    );
  }

  const otraCajaAbierta =
    await obtenerCajaAbierta(
      cierre.tiendaId
    );

  if (
    otraCajaAbierta &&
    otraCajaAbierta.id !==
      cierre.cajaId
  ) {
    throw new Error(
      "No se puede reabrir porque esta tienda ya tiene otra caja abierta."
    );
  }

  const batch =
    writeBatch(
      db
    );

  batch.update(
    cierreRef,
    {
      estado:
        "reabierto",

      fechaReapertura:
        serverTimestamp(),

      reabiertoPor:
        auth.currentUser?.uid ||
        null,
    }
  );

  batch.update(
    cajaRef,
    {
      estado:
        "abierta",

      fechaCierre:
        deleteField(),

      cajaEsperada:
        deleteField(),

      efectivoContado:
        deleteField(),

      diferencia:
        deleteField(),

      conteoEfectivoCierre:
        deleteField(),

      desgloseEfectivoCierre:
        deleteField(),

      totalBilletesCierre:
        deleteField(),

      totalMonedasCierre:
        deleteField(),

      cierreId:
        deleteField(),

      observacionCierre:
        deleteField(),

      cerradoPor:
        deleteField(),

      fechaReapertura:
        serverTimestamp(),

      reabiertoPor:
        auth.currentUser?.uid ||
        null,
    }
  );

  await batch.commit();
}

export async function eliminarCierreDefinitivamente(
  cierreId
) {
  if (!cierreId) {
    throw new Error(
      "No se encontró el cierre."
    );
  }

  const perfil =
    await obtenerPerfilActual();

  if (
    perfil?.superAdmin !==
    true
  ) {
    throw new Error(
      "Solo el Super Admin puede eliminar definitivamente un cierre."
    );
  }

  const cierreRef =
    doc(
      db,
      "cierresCaja",
      cierreId
    );

  const cierreSnap =
    await getDoc(
      cierreRef
    );

  if (!cierreSnap.exists()) {
    throw new Error(
      "El cierre ya no existe."
    );
  }

  const cierre =
    cierreSnap.data();

  const batch =
    writeBatch(
      db
    );

  /*
    Si estamos eliminando el cierre actualmente vigente,
    la caja no puede quedarse cerrada apuntando a un cierre
    que ya no existe. Por eso vuelve a estado ABIERTA.

    NO se borran ventas, gastos, ingresos ni retiros.
    Solo se elimina el documento del cierre.
  */
  if (cierre.cajaId) {
    const cajaRef =
      doc(
        db,
        "cajas",
        cierre.cajaId
      );

    const cajaSnap =
      await getDoc(
        cajaRef
      );

    if (
      cajaSnap.exists()
    ) {
      const caja =
        cajaSnap.data();

      if (
        caja.estado ===
          "cerrada" &&
        caja.cierreId ===
          cierreId
      ) {
        batch.update(
          cajaRef,
          {
            estado:
              "abierta",

            fechaCierre:
              deleteField(),

            cajaEsperada:
              deleteField(),

            efectivoContado:
              deleteField(),

            diferencia:
              deleteField(),

            conteoEfectivoCierre:
              deleteField(),

            desgloseEfectivoCierre:
              deleteField(),

            totalBilletesCierre:
              deleteField(),

            totalMonedasCierre:
              deleteField(),

            cierreId:
              deleteField(),

            observacionCierre:
              deleteField(),

            cerradoPor:
              deleteField(),
          }
        );
      }
    }
  }

  batch.delete(
    cierreRef
  );

  await batch.commit();

  return {
    cierreId,

    cajaReabierta:
      Boolean(
        cierre.cajaId
      ),
  };
}


export function suscribirseCajasAbiertasAnteriores(
  callback,
  tiendaId = "todas"
) {
  const referencia =
    tiendaId &&
    tiendaId !== "todas"
      ? query(
          collection(
            db,
            "cajas"
          ),
          where(
            "tiendaId",
            "==",
            tiendaId
          )
        )
      : collection(
          db,
          "cajas"
        );

  return onSnapshot(
    referencia,

    (snapshot) => {
      const cajas =
        snapshot.docs
          .map(
            (documento) => ({
              id:
                documento.id,

              ...documento.data(),
            })
          )
          .filter(
            (caja) =>
              esCajaAbiertaAnterior(
                caja
              ) &&
              puedeEliminarCajaAnterior(
                caja
              )
          )
          .sort(
            (a, b) =>
              fechaMs(
                b.fechaApertura
              ) -
              fechaMs(
                a.fechaApertura
              )
          );

      callback(
        cajas
      );
    },

    (error) => {
      console.error(
        "Error leyendo cajas abiertas anteriores:",
        error
      );

      callback([]);
    }
  );
}


async function obtenerDocsPorCaja(
  nombreColeccion,
  cajaId
) {
  return getDocs(
    query(
      collection(
        db,
        nombreColeccion
      ),
      where(
        "cajaId",
        "==",
        cajaId
      )
    )
  );
}


export async function eliminarCajaAbiertaAnterior(
  cajaId
) {
  if (!cajaId) {
    throw new Error(
      "No se encontró la caja."
    );
  }

  const perfil =
    await obtenerPerfilActual();

  if (
    perfil?.superAdmin !==
    true
  ) {
    throw new Error(
      "Solo el Super Admin puede eliminar definitivamente una caja anterior."
    );
  }

  const cajaRef =
    doc(
      db,
      "cajas",
      cajaId
    );

  const cajaSnap =
    await getDoc(
      cajaRef
    );

  if (!cajaSnap.exists()) {
    throw new Error(
      "La caja ya no existe."
    );
  }

  const caja =
    cajaSnap.data();

  if (
    caja.estado !==
    "abierta"
  ) {
    throw new Error(
      "Solo se pueden limpiar desde aquí cajas que todavía figuran como abiertas."
    );
  }

  if (
    !puedeEliminarCajaAnterior({
      id:
        cajaId,
      ...caja,
    })
  ) {
    throw new Error(
      "Esta apertura ya no puede eliminarse desde Cierres. El botón solo está disponible durante los 2 días siguientes a la apertura."
    );
  }

  const [
    ventasSnap,
    gastosSnap,
    ingresosSnap,
    retirosSnap,
    cierresSnap,
    plataformasSnap,
  ] = await Promise.all([
    obtenerDocsPorCaja(
      "ventas",
      cajaId
    ),

    obtenerDocsPorCaja(
      "gastos",
      cajaId
    ),

    obtenerDocsPorCaja(
      "ingresos",
      cajaId
    ),

    obtenerDocsPorCaja(
      "retiros",
      cajaId
    ),

    obtenerDocsPorCaja(
      "cierresCaja",
      cajaId
    ),

    obtenerDocsPorCaja(
      "movimientosPlataformas",
      cajaId
    ),
  ]);

  const movimientos =
    ventasSnap.size +
    gastosSnap.size +
    ingresosSnap.size +
    retirosSnap.size +
    plataformasSnap.size;

  if (movimientos > 0) {
    throw new Error(
      `No se puede eliminar esta caja porque tiene ${movimientos} movimiento(s) financiero(s) asociado(s). Primero hay que revisar esos movimientos.`
    );
  }

  /*
    Si la caja fue cerrada y luego reabierta, pueden existir
    cierres históricos ligados a ella. Si no hay movimientos
    financieros, esos cierres se borran junto con la caja para
    que la limpieza sea realmente física.
  */
  if (
    cierresSnap.size >
    450
  ) {
    throw new Error(
      "Esta caja tiene demasiados cierres asociados para eliminarlos desde el navegador."
    );
  }

  const batch =
    writeBatch(
      db
    );

  cierresSnap.docs.forEach(
    (cierreDoc) => {
      batch.delete(
        cierreDoc.ref
      );
    }
  );

  batch.delete(
    cajaRef
  );

  await batch.commit();

  return {
    cajaId,

    cierresEliminados:
      cierresSnap.size,
  };
}


export async function obtenerDatosDescargaCierre(
  cierreId
) {
  if (!cierreId) {
    throw new Error(
      "No se encontró el cierre."
    );
  }

  const cierreRef =
    doc(
      db,
      "cierresCaja",
      cierreId
    );

  const cierreSnap =
    await getDoc(
      cierreRef
    );

  if (!cierreSnap.exists()) {
    throw new Error(
      "El cierre ya no existe."
    );
  }

  const cierre = {
    id:
      cierreSnap.id,
    ...cierreSnap.data(),
  };

  let controlEquipos =
    cierre.controlEquipos ||
    null;

  if (!controlEquipos) {
    controlEquipos =
      await obtenerControlEquiposDia({
        tiendaId:
          cierre.tiendaId,
        fechaReferencia:
          cierre.fechaCierre ||
          cierre.fechaApertura ||
          new Date(),
      });
  }

  const desglose =
    Array.isArray(
      cierre.desgloseEfectivo
    )
      ? cierre.desgloseEfectivo
      : crearDesglose(
          cierre.conteoEfectivo ||
            {}
        );

  const efectivoBase =
    desglose.filter(
      (item) =>
        numero(
          item.cantidad
        ) > 0 &&
        !["c20", "c10"].includes(
          item.clave
        )
    );

  const moneda20 =
    desglose.find(
      (item) => item.clave === "c20"
    );

  const moneda10 =
    desglose.find(
      (item) => item.clave === "c10"
    );

  const cantidad20 =
    numero(moneda20?.cantidad);

  const cantidad10 =
    numero(moneda10?.cantidad);

  const subtotal20 =
    numero(moneda20?.subtotal);

  const subtotal10 =
    numero(moneda10?.subtotal);

  const efectivoVisible = [
    ...efectivoBase,
  ];

  if (
    cantidad20 > 0 ||
    cantidad10 > 0
  ) {
    efectivoVisible.push({
      clave: "c20_c10",
      etiqueta:
        "Céntimos de 20 y 10",
      tipo: "centimo",
      cantidad:
        cantidad20 +
        cantidad10,
      detalleCantidad: [
        cantidad20 > 0
          ? `20 c x ${cantidad20}`
          : "",
        cantidad10 > 0
          ? `10 c x ${cantidad10}`
          : "",
      ]
        .filter(Boolean)
        .join(" + "),
      subtotal:
        subtotal20 +
        subtotal10,
    });
  }

  return {
    cierre,
    controlEquipos,
    efectivoVisible,
    plataformas: {
      recargas: {
        saldoInicial:
          numero(
            cierre.recargasSaldoInicial
          ),
        usado:
          numero(
            cierre.recargasUsado
          ),
        saldoActual:
          numero(
            cierre.recargasSaldoActual
          ),
      },
      recaudacion: {
        saldoInicial:
          numero(
            cierre.recaudacionSaldoInicial
          ),
        usado:
          numero(
            cierre.recaudacionUsado
          ),
        saldoActual:
          numero(
            cierre.recaudacionSaldoActual
          ),
      },
    },
  };
}


export function suscribirseCierres(
  callback,
  tiendaId = "todas"
) {
  const referencia =
    tiendaId &&
    tiendaId !==
      "todas"
      ? query(
          collection(
            db,
            "cierresCaja"
          ),
          where(
            "tiendaId",
            "==",
            tiendaId
          )
        )
      : collection(
          db,
          "cierresCaja"
        );

  return onSnapshot(
    referencia,

    (snapshot) => {
      const cierres =
        snapshot.docs
          .map(
            (documento) => ({
              id:
                documento.id,

              ...documento.data(),
            })
          )
          .sort(
            (a, b) =>
              fechaMs(
                b.fechaCierre
              ) -
              fechaMs(
                a.fechaCierre
              )
          );

      callback(
        cierres
      );
    },

    (error) => {
      console.error(
        "Error leyendo cierres de caja:",
        error
      );

      callback([]);
    }
  );
}
