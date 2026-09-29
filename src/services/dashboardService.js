import {
  collection,
  getDocs,
  query,
  where,
} from "firebase/firestore";

import {
  db,
} from "../firebase/firebaseConfig";




function referenciaPorTienda(
  nombreColeccion,
  tiendaId,
  campo = "tiendaId"
) {
  if (
    !tiendaId ||
    tiendaId === "todas"
  ) {
    return collection(
      db,
      nombreColeccion
    );
  }

  return query(
    collection(
      db,
      nombreColeccion
    ),
    where(
      campo,
      "==",
      tiendaId
    )
  );
}

function numero(valor) {
  const convertido =
    Number(valor);

  return Number.isFinite(
    convertido
  )
    ? convertido
    : 0;
}


function obtenerFecha(valor) {
  if (!valor) {
    return null;
  }

  if (
    typeof valor.toDate ===
    "function"
  ) {
    return valor.toDate();
  }

  const fecha =
    new Date(valor);

  return Number.isNaN(
    fecha.getTime()
  )
    ? null
    : fecha;
}


function esHoy(valor) {
  const fecha =
    obtenerFecha(valor);

  if (!fecha) {
    return false;
  }

  const hoy =
    new Date();

  return (
    fecha.getDate() ===
      hoy.getDate() &&
    fecha.getMonth() ===
      hoy.getMonth() &&
    fecha.getFullYear() ===
      hoy.getFullYear()
  );
}


function perteneceATienda(
  datos,
  tiendaId
) {
  if (
    tiendaId ===
    "todas"
  ) {
    return true;
  }

  return (
    datos.tiendaId ===
    tiendaId
  );
}


function sumar(
  lista,
  campo = "monto"
) {
  return lista.reduce(
    (total, item) =>
      total +
      Number(
        item[campo] || 0
      ),
    0
  );
}


function documentos(
  snapshot
) {
  return snapshot.docs.map(
    (documento) => ({
      id:
        documento.id,

      ...documento.data(),
    })
  );
}


/*
  Los registros antiguos que no tengan metodoPago
  se consideran EFECTIVO para mantener compatibilidad.
*/
function metodoPago(item) {
  return String(
    item?.metodoPago ||
      "efectivo"
  )
    .trim()
    .toLowerCase();
}


function esEfectivo(item) {
  return (
    metodoPago(item) ===
    "efectivo"
  );
}


function esYape(item) {
  return (
    metodoPago(item) ===
    "yape"
  );
}


function movimientoValido(item) {
  const estado =
    String(
      item?.estado || ""
    )
      .trim()
      .toLowerCase();

  return ![
    "anulado",
    "anulada",
    "cancelado",
    "cancelada",
    "eliminado",
    "eliminada",
  ].includes(
    estado
  );
}


export async function obtenerDashboard(
  tiendaId
) {
  const [
    cajasSnap,
    ventasSnap,
    gastosSnap,
    ingresosSnap,
    retirosSnap,
    equiposSnap,
    cierresSnap,
  ] = await Promise.all([
    getDocs(
      referenciaPorTienda(
        "cajas",
        tiendaId
      )
    ),

    getDocs(
      referenciaPorTienda(
        "ventas",
        tiendaId
      )
    ),

    getDocs(
      referenciaPorTienda(
        "gastos",
        tiendaId
      )
    ),

    getDocs(
      referenciaPorTienda(
        "ingresos",
        tiendaId
      )
    ),

    getDocs(
      referenciaPorTienda(
        "retiros",
        tiendaId
      )
    ),

    getDocs(
      referenciaPorTienda(
        "equipos",
        tiendaId,
        "ubicacionActual"
      )
    ),

    getDocs(
      referenciaPorTienda(
        "cierresCaja",
        tiendaId
      )
    ),


  ]);


  const cajas =
    documentos(
      cajasSnap
    );

  const ventas =
    documentos(
      ventasSnap
    );

  const gastos =
    documentos(
      gastosSnap
    );

  const ingresos =
    documentos(
      ingresosSnap
    );

  const retiros =
    documentos(
      retirosSnap
    );

  const equipos =
    documentos(
      equiposSnap
    );

  const cierres =
    documentos(
      cierresSnap
    );


  /*
    CAJAS ABIERTAS
  */
  const cajasAbiertas =
    cajas.filter(
      (caja) =>
        caja.estado ===
          "abierta" &&
        perteneceATienda(
          caja,
          tiendaId
        )
    );


  const cajasAbiertasIds =
    new Set(
      cajasAbiertas.map(
        (caja) =>
          caja.id
      )
    );


  /*
    MOVIMIENTOS DEL DÍA
  */
  const ventasHoy =
    ventas.filter(
      (venta) =>
        perteneceATienda(
          venta,
          tiendaId
        ) &&
        esHoy(
          venta.fecha
        ) &&
        movimientoValido(
          venta
        )
    );


  const gastosHoy =
    gastos.filter(
      (gasto) =>
        perteneceATienda(
          gasto,
          tiendaId
        ) &&
        esHoy(
          gasto.fecha
        ) &&
        movimientoValido(
          gasto
        )
    );


  const ingresosHoy =
    ingresos.filter(
      (ingreso) =>
        perteneceATienda(
          ingreso,
          tiendaId
        ) &&
        esHoy(
          ingreso.fecha
        ) &&
        movimientoValido(
          ingreso
        )
    );


  const retirosHoy =
    retiros.filter(
      (retiro) =>
        perteneceATienda(
          retiro,
          tiendaId
        ) &&
        esHoy(
          retiro.fecha
        ) &&
        movimientoValido(
          retiro
        )
    );


  function perteneceCajaAbierta(
    item
  ) {
    if (item.cajaId) {
      return (
        cajasAbiertasIds.has(
          item.cajaId
        )
      );
    }

    /*
      Compatibilidad con registros antiguos
      que todavía no tenían cajaId.
    */
    return (
      tiendaId !==
        "todas" &&
      cajasAbiertas.length >
        0 &&
      item.tiendaId ===
        tiendaId
    );
  }


  /*
    =====================================================
    CAJA FÍSICA

    SOLO EFECTIVO entra o sale de caja.
    Yape, Plin, tarjeta y transferencia NO modifican
    la caja física.
    =====================================================
  */
  const ventasCaja =
    ventasHoy.filter(
      (item) =>
        perteneceCajaAbierta(
          item
        ) &&
        esEfectivo(
          item
        )
    );


  const gastosCaja =
    gastosHoy.filter(
      (item) =>
        perteneceCajaAbierta(
          item
        ) &&
        esEfectivo(
          item
        )
    );


  const ingresosCaja =
    ingresosHoy.filter(
      (item) =>
        perteneceCajaAbierta(
          item
        ) &&
        esEfectivo(
          item
        )
    );


  const retirosCaja =
    retirosHoy.filter(
      (item) =>
        perteneceCajaAbierta(
          item
        ) &&
        esEfectivo(
          item
        )
    );


  const cajaInicial =
    sumar(
      cajasAbiertas,
      "cajaInicial"
    );


  const totalVentasEfectivo =
    sumar(
      ventasCaja
    );


  const totalIngresosEfectivo =
    sumar(
      ingresosCaja
    );


  const totalGastosEfectivo =
    sumar(
      gastosCaja
    );


  const totalRetirosEfectivo =
    sumar(
      retirosCaja
    );


  const cajaActual =
    cajaInicial +
    totalVentasEfectivo +
    totalIngresosEfectivo -
    totalGastosEfectivo -
    totalRetirosEfectivo;


  /*
    =====================================================
    R. RECARGAS / RECAUDACIÓN

    Cada caja guarda su saldo inicial.
    El saldo usado se calcula directamente desde las ventas
    tipo R. Recargas o Recaudación asociadas a esa caja.
    En TODAS se consolida el saldo de todas las cajas abiertas.
    =====================================================
  */
  function resumenPlataformaAbierta(
    plataforma
  ) {
    const tipoVenta =
      plataforma === "recargas"
        ? "recarga"
        : "recaudacion";

    let saldoInicial = 0;
    let usado = 0;
    let operaciones = 0;

    cajasAbiertas.forEach(
      (caja) => {
        saldoInicial +=
          numero(
            plataforma ===
              "recargas"
              ? caja.recargasSaldoInicial ||
                  0
              : caja.recaudacionSaldoInicial ||
                  0
          );

        ventas
          .filter(
            (venta) =>
              venta.cajaId ===
                caja.id &&
              movimientoValido(
                venta
              ) &&
              String(
                venta.tipoVenta || ""
              )
                .trim()
                .toLowerCase() ===
                tipoVenta
          )
          .forEach(
            (venta) => {
              usado +=
                numero(
                  venta.monto
                );
              operaciones +=
                1;
            }
          );
      }
    );

    return {
      saldoInicial,
      usado,
      saldoActual:
        saldoInicial - usado,
      operaciones,
    };
  }

  const recargas =
    resumenPlataformaAbierta(
      "recargas"
    );

  const recaudacion =
    resumenPlataformaAbierta(
      "recaudacion"
    );


  /*
    =====================================================
    YAPE DEL DÍA

    Ventas/ingresos por Yape SUMAN.
    Gastos/retiros/devoluciones registradas con Yape
    RESTAN.

    Por eso, si una devolución se registra como retiro
    o gasto con metodoPago: "yape", el saldo baja.
    =====================================================
  */
  const ventasYape =
    ventasHoy.filter(
      esYape
    );


  const ingresosYape =
    ingresosHoy.filter(
      esYape
    );


  const gastosYape =
    gastosHoy.filter(
      esYape
    );


  const retirosYape =
    retirosHoy.filter(
      esYape
    );


  const totalVentasYape =
    sumar(
      ventasYape
    );


  const totalIngresosYape =
    sumar(
      ingresosYape
    );


  const totalGastosYape =
    sumar(
      gastosYape
    );


  const totalRetirosYape =
    sumar(
      retirosYape
    );


  const saldoYape =
    totalVentasYape +
    totalIngresosYape -
    totalGastosYape -
    totalRetirosYape;


  const operacionesYape =
    ventasYape.length +
    ingresosYape.length +
    gastosYape.length +
    retirosYape.length;


  /*
    INVENTARIO
  */
  const equiposDisponibles =
    equipos.filter(
      (equipo) => {
        if (
          equipo.activo ===
          false
        ) {
          return false;
        }

        if (
          equipo.estado ===
          "vendido"
        ) {
          return false;
        }

        if (
          tiendaId ===
          "todas"
        ) {
          return true;
        }

        return (
          equipo.ubicacionActual ===
          tiendaId
        );
      }
    );


  const equiposVendidosHoy =
    ventasHoy.filter(
      (venta) =>
        venta.tipoVenta ===
        "equipo"
    ).length;


  /*
    ÚLTIMO CIERRE
  */
  const cierresTienda =
    cierres
      .filter(
        (cierre) =>
          perteneceATienda(
            cierre,
            tiendaId
          )
      )
      .sort(
        (a, b) => {
          const fechaA =
            obtenerFecha(
              a.fechaCierre
            )?.getTime() ||
            0;

          const fechaB =
            obtenerFecha(
              b.fechaCierre
            )?.getTime() ||
            0;

          return (
            fechaB -
            fechaA
          );
        }
      );


  const ultimoCierre =
    cierresTienda[0] ||
    null;


  /*
    MOVIMIENTOS RECIENTES
  */
  const movimientos = [
    ...ventasHoy.map(
      (item) => ({
        id:
          `venta-${item.id}`,

        descripcion:
          item.descripcion ||
          "Venta",

        tipo:
          item.tipoVenta === "recarga"
            ? "R. Recargas"
            : item.tipoVenta === "recaudacion"
            ? "Recaudación"
            : "Venta",

        monto:
          Number(
            item.monto || 0
          ),

        metodoPago:
          metodoPago(
            item
          ),

        fecha:
          item.fecha,

        positivo:
          true,
      })
    ),

    ...gastosHoy.map(
      (item) => ({
        id:
          `gasto-${item.id}`,

        descripcion:
          item.descripcion ||
          "Gasto",

        tipo:
          "Gasto",

        monto:
          Number(
            item.monto || 0
          ),

        metodoPago:
          metodoPago(
            item
          ),

        fecha:
          item.fecha,

        positivo:
          false,
      })
    ),

    ...ingresosHoy.map(
      (item) => ({
        id:
          `ingreso-${item.id}`,

        descripcion:
          item.descripcion ||
          "Ingreso",

        tipo:
          "Ingreso",

        monto:
          Number(
            item.monto || 0
          ),

        metodoPago:
          metodoPago(
            item
          ),

        fecha:
          item.fecha,

        positivo:
          true,
      })
    ),

    ...retirosHoy.map(
      (item) => ({
        id:
          `retiro-${item.id}`,

        descripcion:
          item.motivo ||
          item.descripcion ||
          "Retiro",

        tipo:
          "Retiro",

        monto:
          Number(
            item.monto || 0
          ),

        metodoPago:
          metodoPago(
            item
          ),

        fecha:
          item.fecha,

        positivo:
          false,
      })
    ),

  ]
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
    )
    .slice(
      0,
      8
    );


  return {
    /*
      CAJA FÍSICA
    */
    cajaActual,
    cajaInicial,

    totalVentasEfectivo,
    totalIngresosEfectivo,
    totalGastosEfectivo,
    totalRetirosEfectivo,


    /*
      TOTALES GENERALES DEL DÍA
      Incluyen todos los métodos de pago.
    */
    totalVentas:
      sumar(
        ventasHoy
      ),

    totalIngresos:
      sumar(
        ingresosHoy
      ),

    totalGastos:
      sumar(
        gastosHoy
      ),

    totalRetiros:
      sumar(
        retirosHoy
      ),


    /*
      YAPE
    */
    saldoYape,

    totalYape:
      saldoYape,

    totalVentasYape,

    totalIngresosYape,

    totalGastosYape,

    totalRetirosYape,

    operacionesYape,


    /* R. RECARGAS */
    recargasSaldoInicial:
      recargas.saldoInicial,
    recargasUsado:
      recargas.usado,
    recargasSaldoActual:
      recargas.saldoActual,
    recargasOperaciones:
      recargas.operaciones,


    /* RECAUDACIÓN */
    recaudacionSaldoInicial:
      recaudacion.saldoInicial,
    recaudacionUsado:
      recaudacion.usado,
    recaudacionSaldoActual:
      recaudacion.saldoActual,
    recaudacionOperaciones:
      recaudacion.operaciones,


    /*
      OTROS DATOS DEL DASHBOARD
    */
    operacionesVentas:
      ventasHoy.length,

    movimientosGastos:
      gastosHoy.length,

    equiposVendidos:
      equiposVendidosHoy,

    equiposStock:
      equiposDisponibles.length,

    ultimoCierre:
      ultimoCierre
        ? Number(
            ultimoCierre.efectivoContado ??
              ultimoCierre.cajaEsperada ??
              0
          )
        : 0,

    hayCajaAbierta:
      cajasAbiertas.length >
      0,

    movimientos,
  };
}
